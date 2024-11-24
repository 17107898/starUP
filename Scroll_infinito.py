import mysql.connector
import os
from dotenv import load_dotenv
from io import BytesIO  # Para servir dados binários
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, make_response, send_file
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date, time
import secrets
from itsdangerous import URLSafeTimedSerializer
import smtplib
import random
from werkzeug.datastructures import FileStorage  # Certifique-se de que o FileStorage está importado
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd
import numpy as np
from decimal import Decimal
import json
app = Flask(__name__)



# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

# Configurar a chave secreta para a sessão
app.secret_key = os.getenv('SECRET_KEY')  # Chave secreta para proteger os dados da sessão

# Mapeamento de valores para nomes legíveis
SERVICE_LABELS = {
    "desenvolvimento_software": "Desenvolvimento de Software",
    "infraestrutura_ti": "Infraestrutura de TI",
    "seguranca_cibernetica": "Segurança Cibernética",
    "inteligencia_artificial": "Inteligência Artificial",
    "cloud_computing": "Computação em Nuvem",
    "data_science": "Ciência de Dados",
    "desenvolvimento_web": "Desenvolvimento Web",
    "desenvolvimento_mobile": "Desenvolvimento Mobile",
    "iot": "Internet das Coisas (IoT)",
    "suporte_tecnico": "Suporte Técnico",
    "automacao_industrial": "Automação Industrial",
    "devops": "DevOps",
    "analise_de_dados": "Análise de Dados"
}
# ------------------------------------
# Funções de Conexão com o Banco
# ------------------------------------

# Função de conexão com o banco de dados
def connect_to_db():
    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )
    return connection

db = connect_to_db()
cursor = db.cursor()


# ------------------------------------

def get_services_from_db(cliente_id, service_type=None, cep=None, street=None, neighborhood=None, city=None, state=None, urgency=None, localizacao_importante=True):
    print(f"Recebendo parâmetros: service_type={service_type}, cep={cep}, street={street}, neighborhood={neighborhood}, city={city}, state={state}, urgency={urgency}, localizacao_importante={localizacao_importante}")
    
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)
    
    # 1. Obter localização e descrição do cliente da tabela `bd_servicos.servicos`
    query_cliente = """
    SELECT cidade, estado, descricao
    FROM bd_servicos.servicos
    WHERE cliente_id = %s
    """
    cursor.execute(query_cliente, (cliente_id,))
    cliente_info = cursor.fetchone()

    cliente_cidade = cliente_info['cidade'] if cliente_info else None
    cliente_estado = cliente_info['estado'] if cliente_info else None
    cliente_descricao = cliente_info['descricao'] if cliente_info else ""

    # 2. Obter histórico do cliente (se existir)
    query_historico = """
    SELECT DISTINCT bd_servicos.solicitacao.prestador_id, 
           bd_servicos.prestadores.nota, 
           servicos.cidade, 
           servicos.estado
    FROM bd_servicos.solicitacao
    JOIN bd_servicos.servicos 
    ON bd_servicos.solicitacao.prestador_id = servicos.prestador_id
    JOIN bd_servicos.prestadores 
    ON bd_servicos.solicitacao.prestador_id = bd_servicos.prestadores.prestador_id
    WHERE bd_servicos.solicitacao.cliente_id = %s
    """
    cursor.execute(query_historico, (cliente_id,))
    historico = cursor.fetchall()
    
    historico_df = pd.DataFrame(historico) if historico else pd.DataFrame(columns=['prestador_id', 'nota', 'cidade', 'estado'])
    historico_ids = set(historico_df['prestador_id'])  # Conjunto de IDs para evitar duplicados
    
    # Garantir que a média das notas seja float, mesmo que `nota` seja Decimal
    media_nota_historico = float(historico_df['nota'].mean()) if not historico_df.empty else None

    # 3. Obter perfis de todos os prestadores do serviço escolhido
    query_prestadores = """
    SELECT prestadores.prestador_id, 
           prestadores.nome, 
           servicos.tipo_servico AS servico, 
           servicos.descricao, 
           servicos.preferencias_prestador, 
           servicos.localizacao, 
           servicos.rua, 
           servicos.bairro, 
           servicos.cidade, 
           servicos.estado,
           prestadores.nota,
           uploads.id AS upload_id,
           uploads.tipo_arquivo,
           uploads.perfil_foto
    FROM bd_servicos.prestadores
    JOIN bd_servicos.servicos ON prestadores.prestador_id = servicos.prestador_id
    LEFT JOIN bd_servicos.uploads ON prestadores.prestador_id = uploads.prestador_id
    WHERE servicos.tipo_servico = %s
    """
    
    # Adicionar filtro NOT IN apenas se o histórico não estiver vazio
    if historico_ids:
        query_prestadores += " AND prestadores.prestador_id NOT IN (%s)" % ",".join(["%s"] * len(historico_ids))
        cursor.execute(query_prestadores, (service_type, *tuple(historico_ids)))
    else:
        cursor.execute(query_prestadores, (service_type,))  # Sem filtro NOT IN se o histórico estiver vazio
    
    prestadores_servicos_uploads = cursor.fetchall()
    
    prestadores_df = pd.DataFrame(prestadores_servicos_uploads) if prestadores_servicos_uploads else pd.DataFrame(columns=[
        'prestador_id', 'nome', 'servico', 'descricao', 'preferencias_prestador', 
        'localizacao', 'rua', 'bairro', 'cidade', 'estado', 'nota', 'upload_id', 'tipo_arquivo', 'perfil_foto'
    ])
    
    # 4. Criar vetor de atributos usando TF-IDF
    if not prestadores_df.empty:
        prestadores_df['descricao_completa'] = (
            prestadores_df['servico'].fillna('') + " " +
            prestadores_df['descricao'].fillna('') + " " +
            prestadores_df['bairro'].fillna('') + " " +
            prestadores_df['cidade'].fillna('') + " " +
            prestadores_df['estado'].fillna('')
        )
        
        vectorizer = TfidfVectorizer()
        prestadores_tfidf = vectorizer.fit_transform(prestadores_df['descricao_completa'])
    else:
        prestadores_tfidf = None

    # 5. Calcular a pontuação combinada (prioridade para novos perfis)
    if not prestadores_df.empty:
        # Convertendo `nota` para float se necessário
        prestadores_df['nota'] = prestadores_df['nota'].apply(lambda x: float(x) if isinstance(x, Decimal) else x)

        # Pontuação baseada na nota (somente se histórico existir)
        if media_nota_historico:
            prestadores_df['score_nota'] = 1 - abs(prestadores_df['nota'] - media_nota_historico) / 10

        # Pontuação baseada na localização
        if localizacao_importante and cliente_cidade and cliente_estado:
            prestadores_df['score_localizacao'] = (
                (prestadores_df['cidade'] == cliente_cidade).astype(int) * 2 +
                (prestadores_df['estado'] == cliente_estado).astype(int)
            )
        else:
            prestadores_df['score_localizacao'] = 0

        # Pontuação baseada na similaridade de descrição
        if prestadores_tfidf is not None and cliente_descricao:
            cliente_tfidf = vectorizer.transform([cliente_descricao])
            similaridade = cosine_similarity(cliente_tfidf, prestadores_tfidf).flatten()
            prestadores_df['score_similaridade'] = similaridade
        else:
            prestadores_df['score_similaridade'] = 0

        # Prioridade para novos perfis
        prestadores_df['score_prioridade'] = prestadores_df['prestador_id'].apply(
            lambda x: 1 if x not in historico_ids else 0
        )

        # Combinar as pontuações
        prestadores_df['score'] = (
            0.4 * prestadores_df.get('score_nota', 0) +
            0.3 * prestadores_df['score_localizacao'] +
            0.2 * prestadores_df['score_similaridade'] +
            0.1 * prestadores_df['score_prioridade']
        )
    else:
        prestadores_df['score'] = 0.0
    
    # 6. Ordenar por score
    prestadores_df = prestadores_df.sort_values(by='score', ascending=False)
    
    # 7. Montar a estrutura final de resposta
    services = []
    prestadores_ids = set()
    
    for _, prestador in prestadores_df.iterrows():
        if prestador['prestador_id'] not in prestadores_ids:
            prestadores_ids.add(prestador['prestador_id'])

            perfil_foto = next((upload['upload_id'] for upload in prestadores_servicos_uploads
                                if upload['prestador_id'] == prestador['prestador_id'] and
                                upload['tipo_arquivo'] == 'imagem' and upload['perfil_foto'] is not None), None)

            images = [upload['upload_id'] for upload in prestadores_servicos_uploads
                      if upload['prestador_id'] == prestador['prestador_id'] and upload['tipo_arquivo'] == 'imagem' and
                      upload['upload_id'] != perfil_foto]

            videos = [upload['upload_id'] for upload in prestadores_servicos_uploads
                      if upload['prestador_id'] == prestador['prestador_id'] and upload['tipo_arquivo'] == 'video']

            service_type_legivel = SERVICE_LABELS.get(prestador['servico'], "Serviço Desconhecido")

            service = {
                "id": prestador['prestador_id'],
                "perfil_foto": perfil_foto,
                "name": prestador['nome'],
                "service_name": service_type_legivel,
                "description": prestador['descricao'],
                "images": images,
                "videos": videos,
                "location": {
                    "cep": prestador['localizacao'],
                    "street": prestador['rua'],
                    "neighborhood": prestador['bairro'],
                    "city": prestador['cidade'],
                    "state": prestador['estado']
                },
                "person_name": prestador['nome'],
                "rating": prestador['nota'],
                "bio": prestador['preferencias_prestador'],
                "score": prestador['score']
            }

            services.append(service)
            print(f'como está: {services}')
    # Filtrar a lista de services para remover prestadores com IDs no histórico
    # services = [service for service in services if service['id'] not in historico_ids]
    # print(f'historico: {historico}, {cliente_id}')
    cursor.close()
    db.close()
    
    return services




@app.route('/carrossel', methods=['GET'])
def carrossel():
    service_type = request.args.get('serviceType')
    cep = request.args.get('cep')
    street = request.args.get('street')
    neighborhood = request.args.get('neighborhood')
    city = request.args.get('city')
    state = request.args.get('state')
    urgency = request.args.get('urgency')
    localizacao_importante = request.args.get('localizacaoImportante', default='true') == 'true'
    cliente_id = request.args.get('cliente_id')  # Obtenha o cliente_id dos parâmetros da URL
    
    # Log para verificar os filtros recebidos
    print(f"Rota /carrossel - Filtros recebidos: serviceType={service_type}, cep={cep}, neighborhood={neighborhood}, city={city}, state={state}, urgency={urgency}, localizacao_importante={localizacao_importante}, cliente_id={cliente_id}")
    
    # Renderizar a página de carrossel com os novos filtros aplicados, incluindo cliente_id
    return render_template(
        'index.html', 
        cliente_id=cliente_id,
        serviceType=service_type, 
        cep=cep, 
        street=street, 
        neighborhood=neighborhood, 
        city=city, 
        state=state, 
        urgency=urgency,
        localizacaoImportante=localizacao_importante
    )

@app.route('/get_services', methods=['GET'])
def get_services():
    # Obter filtros da URL, incluindo cliente_id
    cliente_id = request.args.get('cliente_id')
    service_type = request.args.get('serviceType')
    cep = request.args.get('cep')
    street = request.args.get('street')
    neighborhood = request.args.get('neighborhood')
    city = request.args.get('city')
    state = request.args.get('state')
    urgency = request.args.get('urgency')
    localizacao_importante = request.args.get('localizacaoImportante', default='true') == 'true'

    # Log para verificar os filtros recebidos
    print(f"Rota /get_services - Filtros recebidos: serviceType={service_type}, cep={cep}, neighborhood={neighborhood}, city={city}, state={state}, urgency={urgency}, localizacao_importante={localizacao_importante}, cliente_id={cliente_id}")
    print(f"está pegando? {cliente_id}")
    print(f"URL recebida: {request.url}")

    # Buscar serviços filtrados com base nas preferências do cliente, incluindo cliente_id
    all_services = get_services_from_db(cliente_id, service_type, cep, street, neighborhood, city, state, urgency, localizacao_importante)
    
    # Log para verificar quantos serviços foram encontrados
    print(f"Total de serviços encontrados: {len(all_services)}")

    # Retornar todos os serviços de uma vez
    return jsonify({
        "services": all_services
    })

def obter_dados_prestador(prestador_id):
    # Conectar ao banco de dados e usar DictCursor para retornar dicionários
        # Conectar ao banco e usar cursor padrão
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)

    # Consulta para obter os feedbacks
    cursor.execute("""
        SELECT comentario, nota, nome_cliente
        FROM bd_servicos.feedback
        WHERE id_prestador = %s
    """, (prestador_id,))
    feedbacks = cursor.fetchall()

    # Inicializar o dicionário de distribuição das avaliações e variáveis para cálculo
    avaliacoes_distribuicao = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    total_avaliacoes = len(feedbacks)
    soma_notas = 0

    # Contar avaliações para cada nota e calcular a soma das notas
    for feedback in feedbacks:
        nota = feedback['nota']
        avaliacoes_distribuicao[nota] += 1
        soma_notas += nota

    # Calcular a nota média
    nota_media = soma_notas / total_avaliacoes if total_avaliacoes > 0 else 0

    # Fechar cursor e conexão
    cursor.close()
    db.close()

    # Retornar os dados do prestador, incluindo a distribuição de avaliações e a média
    prestador_dados = {
        'nota_media': nota_media,
        'avaliacoes': avaliacoes_distribuicao,
        'total_avaliacoes': total_avaliacoes,
        'feedbacks': feedbacks
    }
    return prestador_dados

# Transformar `data_contato` em uma estrutura organizada
def tratar_data_contato(data_contato):
    dias_horas = {}
    if data_contato:  # Verifica se há algum dado
        try:
            pares = data_contato.split(";")  # Divide pelos dias
            for par in pares:
                dia, hora = par.strip().split(" ")  # Divide o dia da hora
                dias_horas[dia] = hora
        except ValueError:
            # Caso haja algum erro no formato dos dados, retornar vazio
            print("Erro ao tratar data_contato. Formato inválido:", data_contato)
            return {}
    return dias_horas


@app.route('/perfil_prestador', methods=['GET'])
def perfil_prestador():
    prestador_id_url = request.args.get('prestador_id')
    cliente_id_url = request.args.get('cliente_id')  # Pega o cliente_id da URL

    if not prestador_id_url:
        return "ID do prestador não fornecido", 400

    # Conectar ao banco e usar cursor padrão
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)

    # Consulta ao banco de dados para obter os dados do prestador e seus serviços
    cursor.execute("""
        SELECT prestadores.prestador_id AS prestador_id, 
               prestadores.nome, 
               prestadores.email, 
               prestadores.contato,
               servicos.tipo_servico AS service_type, 
               servicos.descricao, 
               servicos.orcamento, 
               servicos.urgencia, 
               servicos.localizacao, 
               servicos.rua, 
               servicos.bairro, 
               servicos.cidade, 
               servicos.estado, 
               servicos.metodo_contato, 
               servicos.data_contato, 
               servicos.comentarios, 
               uploads.id AS upload_id, 
               uploads.tipo_arquivo, 
               uploads.perfil_foto,
               uploads.tipo_certificado
        FROM bd_servicos.prestadores
        JOIN bd_servicos.servicos 
            ON prestadores.prestador_id = servicos.prestador_id
        LEFT JOIN bd_servicos.uploads 
            ON prestadores.prestador_id = uploads.prestador_id  
        WHERE prestadores.prestador_id = %s;
    """, (prestador_id_url,))
    
    prestador = cursor.fetchall()

    if not prestador:
        return "Prestador não encontrado", 404

    # Agora buscar todos os feedbacks relacionados ao prestador
    cursor.execute("""
        SELECT comentario, nota, nome_cliente
        FROM bd_servicos.feedback
        WHERE id_prestador = %s
    """, (prestador_id_url,))
    
    feedbacks = cursor.fetchall()

    # Verificar se o cliente_id_url foi passado e consultar se for o caso
    is_owner = False  # Inicializar como falso
    
    if cliente_id_url:
        cursor.execute("""
            SELECT cliente_id, nome, 'cliente' AS tipo_usuario
            FROM bd_servicos.clientes
            WHERE cliente_id = %s
        """, (cliente_id_url,))
        cliente = cursor.fetchone()
        
        if cliente:
            is_owner = False  # O cliente nunca será o dono do prestador, apenas um visitante

    else:
        # Consultar se o usuário logado é o prestador
        cursor.execute("""
            SELECT prestador_id, nome, 'prestador' AS tipo_usuario
            FROM bd_servicos.prestadores
            WHERE prestador_id = %s
        """, (prestador_id_url,))
        
        prestador_logado = cursor.fetchone()
        if prestador_logado:
            is_owner = True  # Se o prestador acessando o perfil é o mesmo que o prestador_id da URL, então ele é o dono

    cursor.close()
    db.close()

    # Calcular a média das notas dos feedbacks
    media_nota = 0
    if feedbacks:
        total_feedbacks = len(feedbacks)
        soma_notas = sum(feedback['nota'] for feedback in feedbacks)
        media_nota = round(soma_notas / total_feedbacks, 2)

    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor()

    # Atualizar a média de nota no prestador
    cursor.execute("""
        UPDATE bd_servicos.prestadores 
        SET nota = %s 
        WHERE prestador_id = %s
    """, (media_nota, prestador_id_url))

    db.commit()
    cursor.close()
    db.close()

    dias_horas_contato = tratar_data_contato(prestador[0]['data_contato'])
    print(f"como está tratado dia e hora: {dias_horas_contato}")

    prestador_dados = {
        'nome': prestador[0]['nome'],
        'email': prestador[0]['email'],
        'contato': prestador[0]['contato'],
        'nota': media_nota,  # Usamos a nova média calculada
        'service_type': prestador[0]['service_type'],
        'descricao': prestador[0]['descricao'],
        'orcamento': prestador[0]['orcamento'],
        'urgencia': prestador[0]['urgencia'],
        'localizacao': prestador[0]['localizacao'],
        'rua': prestador[0]['rua'],
        'bairro': prestador[0]['bairro'],
        'cidade': prestador[0]['cidade'],
        'estado': prestador[0]['estado'],
        'metodo_contato': prestador[0]['metodo_contato'],
        'data_contato': dias_horas_contato,
        'comentarios': prestador[0]['comentarios'],
        'feedbacks': feedbacks,
    }

    perfil_foto = next((upload['upload_id'] for upload in prestador if upload['tipo_arquivo'] == 'imagem' and upload['perfil_foto'] is not None), None)
    images = [upload['upload_id'] for upload in prestador if upload['tipo_arquivo'] == 'imagem' and upload['upload_id'] != perfil_foto]
    videos = [upload['upload_id'] for upload in prestador if upload['tipo_arquivo'] == 'video']

    # Coletar os certificados do prestador e enviar para o frontend
    certificados = [(upload['upload_id'], upload['tipo_certificado'].decode('utf-8') if isinstance(upload['tipo_certificado'], bytes) else upload['tipo_certificado'])
                    for upload in prestador if upload['tipo_certificado']]

    # Remover duplicatas de certificados
    certificados_unicos = list(dict.fromkeys(certificados))  # Remove duplicatas
    # Exemplo de como obter e passar os dados para o template
    # Adicionar dados de avaliação diretamente no dicionário `prestador_dados`
    avaliacao_dados = obter_dados_prestador(prestador_id_url)
    prestador_dados.update(avaliacao_dados)  # Mescla os dados de avaliação

    return render_template(
        'perfil_prestador.html',
        prestador_id=prestador_id_url,
        prestador=prestador_dados,
        certificados=certificados,
        perfil_foto=perfil_foto,
        images=images,
        videos=videos,
        is_owner=is_owner
    )
@app.route('/api/get-prestador', methods=['GET'])
def get_prestador():
    # Receber o ID do prestador como parâmetro de consulta
    prestador_id = request.args.get('prestador_id')

    if not prestador_id:
        return jsonify({"error": "prestador_id não fornecido"}), 400

    # Query para buscar dados dos prestadores e serviços
    query_prestadores = """
        SELECT prestadores.prestador_id, 
               prestadores.nome, 
               servicos.tipo_servico AS servico, 
               servicos.descricao, 
               servicos.preferencias_prestador, 
               servicos.localizacao, 
               servicos.rua, 
               servicos.bairro, 
               servicos.cidade, 
               servicos.estado,
               prestadores.nota
        FROM bd_servicos.prestadores
        JOIN bd_servicos.servicos ON prestadores.prestador_id = servicos.prestador_id
        WHERE prestadores.prestador_id = %s
    """

    # Query para buscar uploads (imagens e vídeos)
    query_uploads = """
        SELECT prestador_id, 
               id AS upload_id, 
               tipo_arquivo, 
               perfil_foto
        FROM bd_servicos.uploads
        WHERE prestador_id = %s
    """

    try:
        # Conectar ao banco de dados
        db = connect_to_db()
        cursor = db.cursor(dictionary=True)

        # Executar a consulta para prestadores
        cursor.execute(query_prestadores, (prestador_id,))
        prestadores_result = cursor.fetchall()

        # Se nenhum prestador for encontrado
        if not prestadores_result:
            return jsonify({"error": "Prestador não encontrado"}), 404

        # Executar a consulta para uploads
        cursor.execute(query_uploads, (prestador_id,))
        uploads_result = cursor.fetchall()

        # Criar DataFrame de prestadores
        import pandas as pd
        prestadores_df = pd.DataFrame(prestadores_result)

        # Processar os dados usando a função fornecida
        resultado = processar_prestadores(prestadores_df, uploads_result)

        # Retornar os dados processados
        return jsonify(resultado)

    except Exception as e:
        # Log detalhado do erro no servidor
        print(f"Erro ao processar o ID {prestador_id}: {str(e)}")
        return jsonify({"error": "Erro interno no servidor", "details": str(e)}), 500

    finally:
        # Fechar o cursor e a conexão com o banco de dados
        if cursor:
            cursor.close()
        if db:
            db.close()


def processar_prestadores(prestadores_df, prestadores_servicos_uploads):
    prestadores_ids = set()  # Conjunto para evitar duplicações
    resultado = []  # Lista para armazenar os dados processados

    for _, prestador in prestadores_df.iterrows():
        if prestador['prestador_id'] not in prestadores_ids:
            prestadores_ids.add(prestador['prestador_id'])

            # Foto de perfil
            perfil_foto = next(
                (upload['upload_id'] for upload in prestadores_servicos_uploads
                 if upload['prestador_id'] == prestador['prestador_id'] and
                 upload['tipo_arquivo'] == 'imagem' and upload['perfil_foto'] is not None),
                None
            )

            # Imagens (exceto a foto de perfil)
            images = [
                upload['upload_id'] for upload in prestadores_servicos_uploads
                if upload['prestador_id'] == prestador['prestador_id'] and
                upload['tipo_arquivo'] == 'imagem' and upload['upload_id'] != perfil_foto
            ]

            # Vídeos
            videos = [
                upload['upload_id'] for upload in prestadores_servicos_uploads
                if upload['prestador_id'] == prestador['prestador_id'] and upload['tipo_arquivo'] == 'video'
            ]

            # Tipo de serviço legível
            service_type_legivel = SERVICE_LABELS.get(prestador['servico'], "Serviço Desconhecido")

            # Estrutura do prestador
            service = {
                "id": prestador['prestador_id'],
                "perfil_foto": perfil_foto,
                "name": prestador['nome'],
                "service_name": service_type_legivel,
                "description": prestador['descricao'],
                "images": images,
                "videos": videos,
                "location": {
                    "cep": prestador['localizacao'],
                    "street": prestador['rua'],
                    "neighborhood": prestador['bairro'],
                    "city": prestador['cidade'],
                    "state": prestador['estado']
                },
                "person_name": prestador['nome'],
                "rating": prestador['nota'],
                "bio": prestador['preferencias_prestador']
            }

            resultado.append(service)

    return resultado


meses_portugues = {
    1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr', 5: 'Mai', 6: 'Jun',
    7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez'
}

def formatar_data_brasileira(data_obj):
    """Converte objeto datetime ou date para string formatada no estilo brasileiro (dd Mmm yyyy)"""
    if isinstance(data_obj, (datetime, date)):
        dia = data_obj.day
        mes = meses_portugues[data_obj.month]
        ano = data_obj.year
        return f'{dia} {mes} {ano}'
    return str(data_obj)


def timedelta_to_string(time_obj):
    """Converte objeto time ou timedelta para string formatada (HH:MM)"""
    if isinstance(time_obj, time):
        return time_obj.strftime('%H:%M')  # Formato de horas e minutos
    return str(time_obj)

@app.route('/api/solicitacoes', methods=['GET'])
def get_solicitacoes():
    prestador_id = session.get('prestador_id')
    
    if not prestador_id:
        return jsonify({'error': 'Prestador não autenticado'}), 401
    
    # Conectar ao banco de dados e buscar as solicitações ordenadas
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, nome_cliente, mensagem, orcamento, urgencia, data_contato, hora_contato, contato_cliente, lido, status, data_solicitacao_cliente 
        FROM solicitacao 
        WHERE prestador_id = %s
        ORDER BY lido ASC, status = 'aceito', data_solicitacao_cliente DESC
    """, (prestador_id,))
    
    solicitacoes = cursor.fetchall()
    
    # Formatar datas e horas
    for solicitacao in solicitacoes:
        if 'data_contato' in solicitacao and solicitacao['data_contato']:
            data_contato = solicitacao['data_contato']
            if isinstance(data_contato, (datetime, date)):
                solicitacao['data_contato'] = formatar_data_brasileira(data_contato)
        if 'hora_contato' in solicitacao and solicitacao['hora_contato']:
            solicitacao['hora_contato'] = timedelta_to_string(solicitacao['hora_contato'])  # Converter hora para string HH:MM
    
    cursor.close()
    db.close()
    
    return jsonify({'solicitacoes': solicitacoes})



@app.route('/api/marcar_lido/<int:solicitacao_id>', methods=['POST'])
def marcar_lido(solicitacao_id):
    prestador_id = session.get('prestador_id')

    if not prestador_id:
        return jsonify({'error': 'Prestador não autenticado'}), 401

    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor()

    # Verificar se a solicitação já foi marcada como lida
    cursor.execute("""
        SELECT lido FROM solicitacao WHERE id = %s AND prestador_id = %s
    """, (solicitacao_id, prestador_id))  # Aqui usa 'id', pois solicitacao_id refere-se ao campo id da solicitacao
    resultado = cursor.fetchone()

    if resultado and resultado[0] == 1:  # Se já estiver lido, não faça update
        cursor.close()
        db.close()
        return jsonify({'message': 'Solicitação já foi marcada como lida anteriormente.'})

    # Atualizar o status de lido e registrar a data e hora
    cursor.execute("""
        UPDATE solicitacao 
        SET lido = TRUE, data_visto_prestador = NOW() 
        WHERE id = %s AND prestador_id = %s
    """, (solicitacao_id, prestador_id))  # Aqui também, usa 'id'

    db.commit()
    cursor.close()
    db.close()

    return jsonify({'message': 'Solicitação marcada como lida'})



@app.route('/api/aceitar_servico/<int:solicitacao_id>', methods=['POST'])
def aceitar_servico(solicitacao_id):
    prestador_id = session.get('prestador_id')

    if not prestador_id:
        return jsonify({'error': 'Prestador não autenticado'}), 401

    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor()

    # Verificar se o serviço já foi aceito
    cursor.execute("""
        SELECT status FROM solicitacao WHERE id = %s AND prestador_id = %s
    """, (solicitacao_id, prestador_id))  # Alterado para usar o `id` da solicitação (solicitacao_id)
    resultado = cursor.fetchone()

    if resultado and resultado[0] == 'aceito':  # Se já estiver aceito, não faça update
        cursor.close()
        db.close()
        return jsonify({'message': 'Serviço já foi aceito anteriormente.'})

    # Atualizar o status de aceito e registrar a data e hora
    cursor.execute("""
        UPDATE solicitacao 
        SET status = 'aceito', dta_feed_back_prestador = NOW() 
        WHERE id = %s AND prestador_id = %s
    """, (solicitacao_id, prestador_id))  # Alterado para usar `id` da solicitação

    db.commit()
    cursor.close()
    db.close()

    return jsonify({'message': 'Serviço aceito com sucesso!'})

@app.route('/api/nao_aceitar_servico/<int:solicitacao_id>', methods=['POST'])
def nao_aceitar_servico(solicitacao_id):
    prestador_id = session.get('prestador_id')

    if not prestador_id:
        return jsonify({'error': 'Prestador não autenticado'}), 401

    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor()

    # Verificar se o serviço já foi recusado
    cursor.execute("""
        SELECT status FROM solicitacao WHERE id = %s AND prestador_id = %s
    """, (solicitacao_id, prestador_id))
    resultado = cursor.fetchone()

    if resultado and resultado[0] == 'não aceito':  # Se já estiver recusado, não faça update
        cursor.close()
        db.close()
        return jsonify({'message': 'Serviço já foi recusado anteriormente.'})

    # Atualizar o status para não aceito e registrar a data e hora
    cursor.execute("""
        UPDATE solicitacao 
        SET status = 'não aceito', dta_feed_back_prestador = NOW() 
        WHERE id = %s AND prestador_id = %s
    """, (solicitacao_id, prestador_id))

    db.commit()
    cursor.close()
    db.close()

    return jsonify({'message': 'Serviço recusado com sucesso!'})



@app.route('/api/servico/<int:service_id>', methods=['GET'])
def get_service(service_id):
    cliente_id = session.get('cliente_id')
    print(f'Cliente ID recebido: {cliente_id}')

    if not cliente_id:
        return jsonify({'error': 'Cliente não autenticado'}), 401

    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)

    try:
        # Verificar se o cliente já enviou uma solicitação para o prestador
        cursor.execute("""
            SELECT COUNT(*) AS ja_enviado 
            FROM bd_servicos.solicitacao
            WHERE cliente_id = %s AND prestador_id = %s
        """, (cliente_id, service_id))

        ja_enviado = cursor.fetchone()['ja_enviado'] > 0

        # Buscar os detalhes do serviço
        cursor.execute("""
            SELECT tipo_servico AS service_name, descricao, orcamento, urgencia, data_contato, 
                   localizacao, rua, bairro, cidade, estado, metodo_contato
            FROM bd_servicos.servicos
            WHERE prestador_id = %s
        """, (service_id,))

        service = cursor.fetchone()
        if not service:
            return jsonify({'error': 'Serviço não encontrado'}), 404

        # Adicionar o status de "já enviado" ao JSON
        service['ja_enviado'] = ja_enviado

    except Exception as e:
        print(f"Erro ao buscar serviço: {e}")
        return jsonify({'error': 'Erro interno no servidor'}), 500

    finally:
        cursor.close()
        db.close()

    return jsonify(service)




@app.route('/api/verificar_solicitacoes', methods=['GET'])
def verificar_solicitacoes():
    prestador_id = session.get('prestador_id')

    if not prestador_id:
        return jsonify({'count': 0})

    # Conectar ao banco de dados e buscar o número de solicitações não lidas
    db = connect_to_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT COUNT(*) 
        FROM solicitacao 
        WHERE prestador_id = %s AND lido = FALSE
    """, (prestador_id,))
    count = cursor.fetchone()[0]

    cursor.close()
    db.close()

    return jsonify({'count': count})



# Rota para obter certificados do banco de dados (LONGBLOB)
@app.route('/uploads/certificado/<int:certificado_id>')
def get_certificado_from_db(certificado_id):
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)

    query = "SELECT arquivo, tipo_certificado FROM bd_servicos.uploads WHERE id = %s AND tipo_arquivo = 'certificado'"
    cursor.execute(query, (certificado_id,))
    result = cursor.fetchone()

    cursor.close()
    db.close()

    if not result:
        return "Certificado não encontrado", 404

    certificado_data = result.get('arquivo')
    tipo_certificado = result.get('tipo_certificado')

    # Certificar-se de que tipo_certificado está em string
    if isinstance(tipo_certificado, bytes):
        tipo_certificado = tipo_certificado.decode('utf-8')

    # Verificar se os dados foram recuperados corretamente
    print(f'Certificado ID: {certificado_id}, Tipo: {tipo_certificado}, Tamanho do arquivo: {len(certificado_data) if certificado_data else "N/A"}')

    if not certificado_data or not tipo_certificado:
        return jsonify({'error': 'Erro ao recuperar o certificado ou tipo'}), 500

    # Definir o mime type com base na extensão do arquivo
    if tipo_certificado.endswith('.png'):
        mime_type = 'image/png'
    elif tipo_certificado.endswith('.jpg') or tipo_certificado.endswith('.jpeg'):
        mime_type = 'image/jpeg'
    elif tipo_certificado.endswith('.pdf'):
        mime_type = 'application/pdf'
    else:
        mime_type = 'application/octet-stream'  # Tipo genérico para outros formatos

    return send_file(BytesIO(certificado_data), mimetype=mime_type, download_name=tipo_certificado)


@app.route('/api/remover_certificado', methods=['POST'])
def remover_certificado():
    prestador_id = session.get('prestador_id')  # Pegar o ID do prestador da sessão
    certificado_id = request.json.get('certificado_id')  # Receber o ID do certificado
    certificado_nome = request.json.get('certificado_nome')  # Receber o nome do certificado a ser removido

    # Verificar se os parâmetros foram fornecidos corretamente
    if not prestador_id or not certificado_id or not certificado_nome:
        return jsonify({'message': 'Informações inválidas para remoção do certificado.'}), 400

    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor()

    # Remover o certificado com base no prestador_id e no certificado_id
    cursor.execute("""
        DELETE FROM bd_servicos.uploads
        WHERE prestador_id = %s AND id = %s AND tipo_certificado = %s AND tipo_arquivo = 'certificado'
    """, (prestador_id, certificado_id, certificado_nome))

    # Confirmar a remoção no banco de dados
    db.commit()

    cursor.close()
    db.close()

    return jsonify({'message': 'Certificado removido com sucesso.'})

@app.route('/api/remover_midia', methods=['POST'])
def remover_midia():
    image_id = request.form.get('image_id')
    prestador_id = session.get('prestador_id')
    print(f"Image ID received: {image_id}")
    print(f"Prestador ID received: {prestador_id}")
    
    if image_id:
        # Corrigir o parâmetro para uma tupla (image_id,)
        cursor.execute("""
            DELETE FROM bd_servicos.uploads
            WHERE id = %s AND (tipo_arquivo = 'imagem' OR tipo_arquivo = 'video') AND perfil_foto IS NULL
        """, (image_id,))  # Colocar uma vírgula para indicar que é uma tupla
        db.commit()

        return jsonify({'success': True, 'message': 'Mídia removida com sucesso.'})
    else:
        return jsonify({'success': False, 'message': 'ID da mídia não fornecido.'}), 400



@app.route('/api/editar_prestador', methods=['POST'])
def editar_prestador():
    prestador_id = session.get('prestador_id')
    dias_horarios_contato = request.form.get('dias_horarios_contato', '')  # Obtem o valor enviado
    print(f"Dias e horários recebidos: {dias_horarios_contato}")

    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor()

    # Receber dados do formulário
    contato = request.form.get('contato')
    service_type = request.form.get('service_type')
    descricao = request.form.get('descricao')
    orcamento = request.form.get('orcamento')
    urgencia = request.form.get('urgencia')
    localizacao = request.form.get('localizacao')
    rua = request.form.get('rua')
    bairro = request.form.get('bairro')
    cidade = request.form.get('cidade')
    estado = request.form.get('estado')
    metodo_contato = request.form.get('metodo_contato')
    contact_days_and_times = request.form.get('contactDaysAndTimes')
    if contact_days_and_times:
        contact_days_and_times = json.loads(contact_days_and_times)
    else:
        contact_days_and_times = []

    if not contact_days_and_times:
        return jsonify({
            'message': 'Por favor, selecione pelo menos um dia e horário de contato.',
            'success': False
        }), 400

    formatted_contact_date = "; ".join([f"{item['day']} {item['time']}" for item in contact_days_and_times])



    # Atualizar os dados do prestador no banco de dados
    cursor.execute("""
        UPDATE bd_servicos.prestadores
        SET contato = %s
        WHERE prestador_id = %s
    """, (contato, prestador_id))

    cursor.execute("""
        UPDATE bd_servicos.servicos
        SET tipo_servico = %s, descricao = %s, orcamento = %s, urgencia = %s, localizacao = %s, rua = %s, bairro = %s, cidade = %s, estado = %s, metodo_contato = %s, data_contato = %s
        WHERE prestador_id = %s
    """, (service_type, descricao, orcamento, urgencia, localizacao, rua, bairro, cidade, estado, metodo_contato, formatted_contact_date, prestador_id))

    # Verificar se uma nova foto de perfil foi enviada
    # Verificar se uma nova foto de perfil foi enviada
    if 'perfil_foto' in request.files:
        perfil_foto = request.files['perfil_foto']
        if perfil_foto.filename != '':
            perfil_foto_binario = perfil_foto.read()  # Ler conteúdo binário
            # Substituir a foto de perfil existente
            cursor.execute("""
                INSERT INTO bd_servicos.uploads (prestador_id, arquivo, tipo_arquivo, perfil_foto, created_at)
                VALUES (%s, %s, 'imagem', 'perfil', NOW())
                ON DUPLICATE KEY UPDATE arquivo = %s
            """, (prestador_id, perfil_foto_binario, perfil_foto_binario))
    # Verificar se os documentos foram enviados
    # Verificar se os documentos foram enviados
    if 'documents' in request.files:
        # Simulação do recebimento de arquivos
        documents = request.files.getlist('documents')

        # Remover duplicatas com base no nome dos arquivos
        unique_documents = []
        file_names = set()

        for doc in documents:
            if doc.filename not in file_names:
                unique_documents.append(doc)
                file_names.add(doc.filename)

        print(f"Documentos recebidos sem duplicatas: {unique_documents}")

        # Verificação para evitar caso de lista vazia ou arquivo vazio específico
        if not (len(unique_documents) == 1 and unique_documents[0].filename == ''):
            print(f"Documentos válidos para inserção: {unique_documents}")

            # Inserir novos documentos
            for document in unique_documents:
                if document.filename != '':  # Verificação para evitar arquivos sem nome
                    document_binario = document.read()  # Ler conteúdo binário

                    # Verificar se o documento já existe no banco de dados com base no conteúdo binário e prestador_id
                    cursor.execute("""
                        SELECT COUNT(*)
                        FROM bd_servicos.uploads
                        WHERE prestador_id = %s AND tipo_arquivo = 'imagem' AND arquivo = %s
                    """, (prestador_id, document_binario))
                    
                    (exists,) = cursor.fetchone()
                    
                    if exists == 0:
                        # O arquivo não existe, então o inserimos
                        cursor.execute("""
                            INSERT INTO bd_servicos.uploads (prestador_id, arquivo, tipo_arquivo, created_at)
                            VALUES (%s, %s, 'imagem', NOW())
                        """, (prestador_id, document_binario))
                        db.commit()  # Confirma a inserção
                        print(f"Documento '{document.filename}' inserido com sucesso.")
                    else:
                        print(f"O documento '{document.filename}' já existe no banco de dados e não será inserido novamente.")
        else:
            print("Nenhum documento válido para inserção.")

    # Verificar se o vídeo foi enviado
    if 'video' in request.files:
        video = request.files['video']
        if video.filename != '':
            video_binario = video.read()  # Ler conteúdo binário
            # Substituir o vídeo existente
            cursor.execute("""
                DELETE FROM bd_servicos.uploads
                WHERE prestador_id = %s AND tipo_arquivo = 'video'
            """, (prestador_id,))
            db.commit()

            cursor.execute("""
                INSERT INTO bd_servicos.uploads (prestador_id, arquivo, tipo_arquivo, created_at)
                VALUES (%s, %s, 'video', NOW())
            """, (prestador_id, video_binario))

    # Verificar se os certificados foram enviados
    if 'certificados' in request.files:
        certificados = request.files.getlist('certificados')

        for certificado in certificados:
            if certificado.filename != '':
                # Verificar se já existe um certificado com o mesmo nome para evitar duplicação
                cursor.execute("""
                    SELECT id FROM bd_servicos.uploads 
                    WHERE prestador_id = %s AND tipo_certificado = %s AND tipo_arquivo = 'certificado'
                """, (prestador_id, certificado.filename))

                duplicado = cursor.fetchone()

                if duplicado:
                    # Se já existir um certificado com o mesmo nome, pular a inserção
                    print(f"Certificado {certificado.filename} já existe. Pulando inserção.")
                    continue

                certificado_binario = certificado.read()
                cursor.execute("""
                    INSERT INTO bd_servicos.uploads (prestador_id, arquivo, tipo_arquivo, tipo_certificado, created_at)
                    VALUES (%s, %s, 'certificado', %s, NOW())
                """, (prestador_id, certificado_binario, certificado.filename))


    # Commit das mudanças no banco de dados
    db.commit()
    cursor.close()
    db.close()

    # Responder com uma mensagem de sucesso
    return jsonify({'message': 'Dados e mídias atualizados com sucesso.'})

from flask import request, jsonify

@app.route('/api/remover_foto_perfil', methods=['POST'])
def remover_foto_perfil():
    prestador_id = request.form.get('prestador_id')
    foto_id = request.form.get('foto_id')

    if not prestador_id or foto_id in ('None', ''):
        return jsonify({'success': False, 'message': 'ID do prestador ou ID da foto inválido.'}), 400

    try:
        # Verifica se o registro da foto existe
        cursor.execute("""
            SELECT COUNT(*)
            FROM bd_servicos.uploads
            WHERE id = %s AND prestador_id = %s AND perfil_foto = 'perfil'
        """, (foto_id, prestador_id))
        
        (exists,) = cursor.fetchone()

        if exists == 0:
            return jsonify({'success': False, 'message': 'Foto de perfil não encontrada.'}), 404

        # Remove o registro da foto de perfil
        cursor.execute("""
            DELETE FROM bd_servicos.uploads
            WHERE id = %s AND prestador_id = %s AND perfil_foto = 'perfil'
        """, (foto_id, prestador_id))
        db.commit()

        return jsonify({'success': True, 'message': 'Foto de perfil removida com sucesso.'})
    except Exception as e:
        print("Erro ao remover a foto de perfil:", e)
        return jsonify({'success': False, 'message': 'Erro ao remover a foto de perfil.'}), 500

# Rota para obter imagens do banco de dados (LONGBLOB)
@app.route('/uploads/img/<int:upload_id>')
def get_image_from_db(upload_id):
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)

    query = "SELECT arquivo FROM bd_servicos.uploads WHERE id = %s AND tipo_arquivo = 'imagem'"
    cursor.execute(query, (upload_id,))
    result = cursor.fetchone()

    cursor.close()
    db.close()

    if result:
        image_data = result['arquivo']  # Conteúdo binário
        return send_file(BytesIO(image_data), mimetype='image/jpeg')  # Ajuste o MIME type conforme necessário (ex: image/png, image/jpg)
    else:
        return "Imagem não encontrada", 404
# Rota para obter vídeos do banco de dados (LONGBLOB)
@app.route('/uploads/video/<int:upload_id>')
def get_video_from_db(upload_id):
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)

    query = "SELECT arquivo FROM bd_servicos.uploads WHERE id = %s AND tipo_arquivo = 'video'"
    cursor.execute(query, (upload_id,))
    result = cursor.fetchone()

    cursor.close()
    db.close()

    if result:
        video_data = result['arquivo']  # Conteúdo binário
        return send_file(BytesIO(video_data), mimetype='video/mp4')  # Ajuste o MIME type conforme o tipo de vídeo
    else:
        return "Vídeo não encontrado", 404
    
    
# ------------------------------------
# Rotas para Clientes
# ------------------------------------
@app.route('/', methods=['GET'])
def index():
    return render_template('cadastro.html')
@app.route('/termos_condicoes', methods=['GET'])
def termos_condicoes():
    return render_template('termos_condicoes.html')
@app.route('/politica_privacidade', methods=['GET'])
def politica_privacidade():
    return render_template('politica_privacidade.html')
# Rota para a página de cadastro de cliente
@app.route('/cadastro_cliente', methods=['GET'])
def cadastro_cliente():
    return render_template('cadastro_cliente.html')


@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data['email']
    senha = data['password']

    # Conectar ao banco de dados e configurar cursor para retornar dicionários
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)

    # Buscar o usuário pelo email tanto na tabela de clientes quanto de prestadores
    cursor.execute("""
        SELECT id, nome, email, senha, tipo_usuario 
        FROM (
            SELECT cliente_id AS id, nome, email, senha, 'cliente' AS tipo_usuario 
            FROM bd_servicos.clientes 
            WHERE email = %s
            UNION
            SELECT prestador_id AS id, nome, email, senha, 'prestador' AS tipo_usuario 
            FROM bd_servicos.prestadores 
            WHERE email = %s
        ) AS usuarios
    """, (email, email))
    
    result = cursor.fetchone()

    if result:
        # Mostrar a senha armazenada no banco e a senha recebida do formulário
        print(f"Senha armazenada (hash): {result['senha']}")
        print(f"Senha recebida (plain): {senha}")

        # Verificar a comparação da senha criptografada
        if check_password_hash(result['senha'], senha):
            print("As senhas são iguais.")
            tipo_usuario = result['tipo_usuario']
            
            if tipo_usuario == 'prestador':
                session['prestador_id'] = result['id']  # Armazenar ID do prestador
                # Redirecionar com o prestador_id na URL
                redirect_url = url_for('perfil_prestador', prestador_id=result['id'])
                return jsonify({'redirectUrl': redirect_url})

            elif tipo_usuario == 'cliente':
                cliente_id = result['id']
                session['cliente_id'] = cliente_id  # Armazenar ID do cliente
                
                # Buscar a preferência de localização e os serviços
                cursor.execute("""
                    SELECT servicos.*, clientes.localizacao_importante 
                    FROM bd_servicos.servicos 
                    JOIN bd_servicos.clientes ON clientes.cliente_id = servicos.cliente_id
                    WHERE servicos.cliente_id = %s
                """, (cliente_id,))
                
                servicos = cursor.fetchall()

                if servicos:
                    localizacao_importante = servicos[0]['localizacao_importante']
                    redirect_url = url_for('carrossel', 
                                           cliente_id=cliente_id,
                                           serviceType=servicos[0]['tipo_servico'], 
                                           cep=servicos[0]['localizacao'], 
                                           street=servicos[0]['rua'], 
                                           neighborhood=servicos[0]['bairro'], 
                                           city=servicos[0]['cidade'], 
                                           state=servicos[0]['estado'], 
                                           urgency=servicos[0]['urgencia'], 
                                           localizacaoImportante=localizacao_importante)
                    return jsonify({'redirectUrl': redirect_url})
                else:
                    return jsonify({'message': 'Nenhum serviço encontrado para este cliente'}), 404
            else:
                return jsonify({'message': 'Tipo de usuário inválido'}), 400
        else:
            print("As senhas são diferentes.")
            return jsonify({'message': 'Credenciais inválidas'}), 401
    else:
        return jsonify({'message': 'Usuário não encontrado'}), 404


@app.route('/esqueceu_senha', methods=['GET', 'POST'])
def esqueceu_senha():
    if request.method == 'POST':
        email = request.form.get('email')

        # Conectar ao banco de dados
        db = connect_to_db()
        cursor = db.cursor(dictionary=True)

        # Verificar se o email está cadastrado em clientes ou prestadores
        cursor.execute("""
            SELECT cliente_id, 'cliente' as tipo_usuario FROM bd_servicos.clientes WHERE email = %s
            UNION
            SELECT prestador_id, 'prestador' as tipo_usuario FROM bd_servicos.prestadores WHERE email = %s
        """, (email, email))

        user = cursor.fetchone()

        if user:
            # Gerar token único
            token = secrets.token_urlsafe(16)

            # Salvar o token no banco, associado ao usuário
            if user['tipo_usuario'] == 'cliente':
                cursor.execute("""
                    UPDATE bd_servicos.clientes SET reset_token = %s WHERE cliente_id = %s
                """, (token, user['cliente_id']))
            elif user['tipo_usuario'] == 'prestador':
                cursor.execute("""
                    UPDATE bd_servicos.prestadores SET reset_token = %s WHERE prestador_id = %s
                """, (token, user['prestador_id']))

            db.commit()

            # Enviar email com o link de redefinição
            link = url_for('reset_senha', token=token, _external=True)
            send_email(email, "Recuperação de senha", f"Clique no link para redefinir sua senha: {link}")

            return render_template('mensagem.html', message="Um link de recuperação foi enviado para seu email.")
        else:
            return render_template('mensagem.html', message="Email não encontrado."), 404

    return render_template('esqueceu_senha.html')

import smtplib

def send_email(to, subject, body):
    print("Enviar email")
    # Ajustar para a senha de app gerada pelo Google
    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login('arnaldo166.ado@gmail.com', 'zpml rkkl ldtc echd')
        
        # Garantir que o e-mail será enviado com codificação UTF-8
        message = f"Subject: {subject}\n\n{body}".encode('utf-8')  # Codifica a mensagem para UTF-8
        
        print('Email enviado')
        server.sendmail('arnaldo166.ado@gmail.com', to, message)


@app.route('/reset_senha/<token>', methods=['GET', 'POST'])
def reset_senha(token):
    # Verificar se o token existe e é válido
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)

    # Verificar o token tanto em clientes quanto prestadores
    cursor.execute("""
        SELECT cliente_id, 'cliente' as tipo_usuario FROM bd_servicos.clientes WHERE reset_token = %s
        UNION
        SELECT prestador_id, 'prestador' as tipo_usuario FROM bd_servicos.prestadores WHERE reset_token = %s
    """, (token, token))

    user = cursor.fetchone()

    if not user:
        return render_template('mensagem.html', message="Token inválido ou expirado."), 400

    if request.method == 'POST':
        nova_senha = request.form.get('password')

        # Atualizar a senha no banco e remover o token
        senha_hash = generate_password_hash(nova_senha)

        if user['tipo_usuario'] == 'cliente':
            cursor.execute("""
                UPDATE bd_servicos.clientes SET senha = %s, reset_token = NULL WHERE cliente_id = %s
            """, (senha_hash, user['cliente_id']))
        elif user['tipo_usuario'] == 'prestador':
            cursor.execute("""
                UPDATE bd_servicos.prestadores SET senha = %s, reset_token = NULL WHERE prestador_id = %s
            """, (senha_hash, user['prestador_id']))

        db.commit()

        return render_template('mensagem.html', message="Senha redefinida com sucesso!")

    return render_template('reset_senha.html', token=token)




# Página de cadastro
@app.route('/register', methods=['GET'])
def register_page():
    return render_template('registro.html')


# API de cadastro
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data['email']
    senha = data['password']

    # Buscar o cliente pelo email
    cursor.execute("SELECT id, senha, cliente_id FROM clientes WHERE email = %s", (email,))
    result = cursor.fetchone()

    if result and check_password_hash(result[1], senha):
        # Armazene o `cliente_id` na sessão
        session['cliente_id'] = result[2]  # Aqui salvamos o cliente_id gerado anteriormente
        return jsonify({'message': 'Login bem-sucedido'})
    else:
        return jsonify({'message': 'Credenciais inválidas'}), 401



@app.route('/api/cadastrar-cliente', methods=['POST'])
def cadastrar_cliente():
    data = request.get_json()
    nome = data['name']
    email = data['email']
    senha_hash = generate_password_hash(data['password'])  # Hash da senha
    cnpj = data.get('cnpj', None)

    if cnpj:
        # Remover formatação do CNPJ (mantém apenas os dígitos)
        cnpj = cnpj.replace('.', '').replace('/', '').replace('-', '')

    # Verificar se o e-mail já está cadastrado
    cursor.execute("SELECT id FROM clientes WHERE email = %s", (email,))
    cliente_existente_email = cursor.fetchone()

    # Verificar se o CNPJ já está cadastrado (se o cliente forneceu o CNPJ)
    cliente_existente_cnpj = None
    if cnpj:
        cursor.execute("SELECT id FROM clientes WHERE cnpj = %s", (cnpj,))
        cliente_existente_cnpj = cursor.fetchone()

    # Se o e-mail já estiver cadastrado, retornar uma mensagem de erro
    if cliente_existente_email:
        return jsonify({
            'message': 'O e-mail já está cadastrado. Tente fazer login ou use outro e-mail.',
            'success': False
        }), 400  # Código de erro HTTP 400 - Bad Request

    # Se o CNPJ já estiver cadastrado, retornar uma mensagem de erro
    if cliente_existente_cnpj:
        return jsonify({
            'message': 'O CNPJ já está cadastrado. Tente usar outro CNPJ.',
            'success': False
        }), 400  # Código de erro HTTP 400 - Bad Request

    # Gerar um `cliente_id` aleatório de 7 dígitos
    cliente_id = random.randint(1000000, 9999999)

    # Inserir o novo cliente no banco de dados com tipo_usuario = 'cliente' e o `cliente_id` gerado
    cursor.execute(
        "INSERT INTO clientes (nome, email, senha, cnpj, tipo_usuario, cliente_id) VALUES (%s, %s, %s, %s, 'cliente', %s)",
        (nome, email, senha_hash, cnpj, cliente_id)
    )
    db.commit()

    # Armazenar o `cliente_id` gerado na sessão para futuras requisições
    session['cliente_id'] = cliente_id

    return jsonify({
        'message': 'Cliente cadastrado com sucesso!',
        'redirect': url_for('solicitar_servico'),
        'success': True
    })


# Rota para a página de solicitação de serviço
@app.route('/solicitar_servico', methods=['GET'])
def solicitar_servico():
    # Obter o ID do cliente da sessão (caso ele tenha feito login)
    cliente_id = session.get('cliente_id')
    
    # Verifique se o cliente está logado (cliente_id existe na sessão)
    if not cliente_id:
        return redirect(url_for('register_page'))  # Redirecionar para a página de login se não estiver logado
    print(f"Cliente ID: {cliente_id}")
    
    # Exibir a página de solicitação de serviço
    return render_template('solicitacao_servico.html', cliente_id=cliente_id)

@app.route('/api/solicitar-servico', methods=['POST'])
def api_solicitar_servico():
    # Obter o ID do cliente da sessão
    cliente_id = session.get('cliente_id')

    if not cliente_id:
        return jsonify({'message': 'Erro: Cliente não autenticado'}), 401

    # Obter os dados do formulário
    service_type = request.form.get('serviceType')
    description = request.form.get('description')
    budget = request.form.get('budget')
    urgency = request.form.get('urgency')
    cep = request.form.get('location')  # CEP
    street = request.form.get('street')  # Rua
    neighborhood = request.form.get('neighborhood')  # Bairro
    city = request.form.get('city')  # Cidade
    state = request.form.get('state')  # Estado
    contact_method = request.form.get('contactMethod')
    contact_date = request.form.get('contactDate')
    comments = request.form.get('comments')
    provider_preferences = request.form.get('providerPreferences')
    references = request.files.get('references')  # Arquivo opcional
    localizacao_importante = request.form.get('localizacaoImportante')  # Valor do checkbox

    # Converter o valor do checkbox para True ou False
    if localizacao_importante == 'on':
        localizacao_importante = True
    else:
        localizacao_importante = False

    # Salvar o arquivo de referência, se existir
    referencia_arquivo = None
    if references:
        referencia_arquivo = f'salvar/arquivos/{references.filename}'
        references.save(referencia_arquivo)

    # Atualizar a coluna localizacao_importante no cadastro do cliente
    cursor.execute("""
        UPDATE bd_servicos.clientes 
        SET localizacao_importante = %s
        WHERE id = %s
    """, (localizacao_importante, cliente_id))

    # Verificar se já existe uma solicitação de serviço para este cliente e tipo de serviço
    cursor.execute("""
        SELECT id FROM servicos WHERE cliente_id = %s AND tipo_servico = %s
    """, (cliente_id, service_type))
    servico_existente = cursor.fetchone()

    if servico_existente:
        return jsonify({
            'message': 'Você já solicitou este tipo de serviço. Por favor, aguarde o processamento ou entre em contato para mais informações.',
            'success': False
        }), 400

    # Inserir os dados do serviço no banco de dados, incluindo as informações de localização e urgência
    cursor.execute(
        """
        INSERT INTO servicos (cliente_id, tipo_servico, descricao, orcamento, urgencia, localizacao, 
                              rua, bairro, cidade, estado, metodo_contato, data_contato, comentarios, 
                              preferencias_prestador, referencia_arquivo)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (cliente_id, service_type, description, budget, urgency, cep, street, neighborhood, city, state,
         contact_method, contact_date, comments, provider_preferences, referencia_arquivo)
    )
    db.commit()

    return redirect(url_for('carrossel', cliente_id=cliente_id, serviceType=service_type, cep=cep, street=street, neighborhood=neighborhood, city=city, state=state, urgency=urgency, localizacaoImportante=localizacao_importante))

import base64

@app.route('/api/checar_convite', methods=['GET'])
def checar_convite():
    cliente_id = session.get('cliente_id')
    print(f'Cliente ID recebido: {cliente_id}')
    
    if not cliente_id:
        return jsonify({'error': 'Cliente não autenticado'}), 401

    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)

    try:
        # Buscar status do convite relacionado ao cliente
        cursor.execute("""
            SELECT 
                s.status, 
                s.lido, 
                s.data_visto_prestador, 
                s.dta_feed_back_prestador, 
                s.prestador_id, -- Adiciona o ID do prestador na seleção
                p.nome AS prestador_nome,
                u.arquivo AS foto_perfil
            FROM 
                bd_servicos.solicitacao s
            JOIN 
                bd_servicos.prestadores p ON s.prestador_id = p.prestador_id
            LEFT JOIN 
                bd_servicos.uploads u ON s.prestador_id = u.prestador_id AND u.perfil_foto = 'perfil'
            WHERE 
                s.cliente_id = %s
            ORDER BY 
                s.data_solicitacao DESC;
        """, (cliente_id,))

        convites = cursor.fetchall()

        # Converte a foto do perfil (BLOB) para Base64
        for convite in convites:
            if convite['foto_perfil']:
                convite['foto_perfil'] = base64.b64encode(convite['foto_perfil']).decode('utf-8')

    except Exception as e:
        print(f"Erro ao executar a consulta: {e}")
        return jsonify({'error': 'Erro ao buscar convites no banco de dados'}), 500

    finally:
        cursor.close()
        db.close()

    # Se nenhum convite encontrado, retorne uma lista vazia
    if not convites:
        print("Nenhuma solicitação encontrada.")
        return jsonify([])

    # Retornar os convites
    return jsonify(convites)




@app.route('/api/pegar_prestadores_aceitos', methods=['GET'])
def pegar_prestadores_aceitos():
    cliente_id = session.get('cliente_id')

    if not cliente_id:
        return jsonify({'error': 'Cliente não autenticado'}), 401

    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)

    # Buscar os prestadores que aceitaram o serviço do cliente e que ainda não foram avaliados
    cursor.execute("""
    SELECT s.prestador_id, s.cliente_id, s.nome_cliente, p.nome AS nome_prestador
    FROM bd_servicos.solicitacao s
    JOIN bd_servicos.prestadores p ON s.prestador_id = p.prestador_id
    LEFT JOIN bd_servicos.feedback f ON s.prestador_id = f.id_prestador AND s.cliente_id = f.id_cliente
    WHERE s.cliente_id = %s AND s.status = 'aceito' AND f.id_prestador IS NULL
    """, (cliente_id,))
    
    prestadores_aceitos = cursor.fetchall()

    cursor.close()
    db.close()

    if not prestadores_aceitos:
        return jsonify({'error': 'Nenhum prestador encontrado ou todos já foram avaliados.'}), 404

    return jsonify(prestadores_aceitos)


    return jsonify(prestadores_aceitos)
@app.route('/api/cadastrar_feedback', methods=['POST'])
def cadastrar_feedback():
    cliente_id = session.get('cliente_id')
    data = request.get_json()

    comentario = data.get('comentario')
    nota = data.get('nota')
    id_prestador = data.get('id_prestador')
    nome_cliente = data.get('nome_cliente')

    if not cliente_id:
        return jsonify({'error': 'Cliente não autenticado'}), 401

    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor()

    # Inserir o feedback na tabela
    cursor.execute("""
    INSERT INTO bd_servicos.feedback (comentario, nota, id_prestador, nome_cliente, id_cliente)
    VALUES (%s, %s, %s, %s, %s)
    """, (comentario, nota, id_prestador, nome_cliente, cliente_id))

    db.commit()
    cursor.close()
    db.close()

    return jsonify({'message': 'Feedback cadastrado com sucesso!'})


@app.route('/api/obter_dados_servico/<int:servico_id>', methods=['GET'])
def obter_dados_servico(servico_id):
    print('test')
    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)
    
    # Buscar os dados do serviço com base no ID do serviço e associar com o cliente
    cursor.execute("""
        SELECT s.tipo_servico, s.descricao, s.urgencia, c.localizacao_importante,
               s.localizacao AS cep, s.rua, s.bairro, s.cidade, s.estado
        FROM bd_servicos.servicos s
        LEFT JOIN bd_servicos.clientes c ON s.cliente_id = c.cliente_id
        WHERE c.cliente_id = %s
    """, (servico_id,))
    
    servico = cursor.fetchone()
    
    if servico:
        return jsonify(servico)
    else:
        return jsonify({'error': 'Serviço não encontrado.'}), 404



    
@app.route('/api/alterar_servico/<int:servico_id>', methods=['POST'])
def alterar_servico(servico_id):
    tipo_servico = request.form.get('tipo_servico')
    descricao = request.form.get('descricao')
    urgencia = request.form.get('urgencia')
    localizacao_importante = request.form.get('localizacao_importante') == 'true'  # Converter para booleano

    # Dados de localização (se aplicável)
    cep = request.form.get('location')  # Supondo que location seja cep no banco
    rua = request.form.get('street')  # Supondo que street seja rua no banco
    bairro = request.form.get('neighborhood')  # Supondo que neighborhood seja bairro no banco
    cidade = request.form.get('city')
    estado = request.form.get('state')

    # Conecte-se ao banco de dados e atualize as informações
    db = connect_to_db()
    cursor = db.cursor()

    # Atualizar os campos na tabela 'servicos'
    cursor.execute("""
        UPDATE bd_servicos.servicos 
        SET tipo_servico = %s, descricao = %s, urgencia = %s
        WHERE cliente_id = %s
    """, (tipo_servico, descricao, urgencia, servico_id))

    # Atualizar o campo 'localizacao_importante' na tabela 'clientes'
    cursor.execute("""
        UPDATE bd_servicos.clientes 
        SET localizacao_importante = %s
        WHERE cliente_id = %s
    """, (localizacao_importante, servico_id))  # Atualiza localizacao_importante no cliente

    # Se a localização não for importante, apagar os campos de localização (definir como NULL)
    if not localizacao_importante:
        cursor.execute("""
            UPDATE bd_servicos.servicos
            SET localizacao = NULL, rua = NULL, bairro = NULL, cidade = NULL, estado = NULL
            WHERE cliente_id = %s
        """, (servico_id,))
    else:
        # Se a localização for importante, atualizar os campos com os valores fornecidos
        cursor.execute("""
            UPDATE bd_servicos.servicos
            SET localizacao = %s, rua = %s, bairro = %s, cidade = %s, estado = %s
            WHERE cliente_id = %s
        """, (cep, rua, bairro, cidade, estado, servico_id))

    db.commit()

    return jsonify({'message': 'Serviço alterado com sucesso!'})




@app.route('/api/solicitar_servico_confirmar', methods=['POST'])
def solicitar_servico_confirmar():
    # Receber os dados da solicitação via AJAX
    prestador_id = request.form.get('prestador_id')  # Capturando o prestador_id enviado pelo frontend
    orcamento = request.form.get('orcamento')
    urgencia = request.form.get('urgencia')
    data_contato = request.form.get('data_contato')
    hora_contato = request.form.get('hora_contato')
    mensagem = request.form.get('mensagem_cliente')

    # Validar se o prestador_id foi passado
    if not prestador_id:
        return jsonify({'error': 'ID do prestador não fornecido'}), 400

    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor()

    # Obter nome e email do cliente logado (garantindo que o cliente está logado)
    cliente_id = session.get('cliente_id')
    if not cliente_id:
        return jsonify({'error': 'Usuário não autenticado'}), 401

    cursor.execute("""
        SELECT nome, email 
        FROM bd_servicos.clientes 
        WHERE cliente_id = %s
    """, (cliente_id,))
    cliente_info = cursor.fetchone()

    if not cliente_info:
        return jsonify({'error': 'Cliente não encontrado'}), 404

    nome_cliente = cliente_info[0]
    contato_cliente = cliente_info[1]  # Usar o email como contato do cliente

    # Inserir a solicitação no banco de dados
    cursor.execute("""
        INSERT INTO solicitacao 
        (prestador_id, nome_cliente, contato_cliente, mensagem, orcamento, urgencia, data_contato, hora_contato, status, data_solicitacao_cliente, cliente_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
    """, (prestador_id, nome_cliente, contato_cliente, mensagem, orcamento, urgencia, data_contato, hora_contato, "pendente", cliente_id))

    db.commit()
    cursor.close()
    db.close()

    return jsonify({'message': 'Solicitação enviada com sucesso!'})


# ------------------------------------
# Rotas para Prestadores
# ------------------------------------
@app.route('/api/cadastrar-prestador', methods=['POST'])
def cadastrar_prestador():
    data = request.get_json()
    nome = data.get('name')
    email = data.get('email')
    senha = data.get('password')
    servico = data.get('service')

    # Verificar se todos os campos obrigatórios foram fornecidos
    if not nome or not email or not senha or not servico:
        return jsonify({
            'message': 'Nome, e-mail, senha e serviço são obrigatórios.',
            'success': False
        }), 400

    # Hash da senha
    senha_hash = generate_password_hash(senha)

    # Conectar ao banco de dados
    db = connect_to_db()
    cursor = db.cursor()

    # Verificar se o e-mail já está cadastrado
    cursor.execute("SELECT id FROM prestadores WHERE email = %s", (email,))
    prestador_existente_email = cursor.fetchone()
        # Gerar um prestador_id aleatório de 7 dígitos (1000000 a 9999999)
    prestador_id = random.randint(1000000, 9999999)
    if prestador_existente_email:
        # Fechar conexão com o banco de dados
        cursor.close()
        db.close()

        # Se o e-mail já estiver cadastrado, retornar uma mensagem de erro
        return jsonify({
            'message': 'O e-mail já está cadastrado. Tente fazer login ou use outro e-mail.',
            'success': False
        }), 400  # Código de erro HTTP 400 - Bad Request

    # Inserir o novo prestador no banco de dados (o ID será gerado automaticamente)
    cursor.execute(
        "INSERT INTO prestadores (nome, email, senha, servico, tipo_usuario, prestador_id) VALUES (%s, %s, %s, %s, 'prestador', %s)",
        (nome, email, senha_hash, servico, prestador_id)
    )
    db.commit()

    # Pegar o ID do prestador que acabou de ser inserido


    # Armazenar o ID do prestador na sessão
    session['prestador_id'] = prestador_id

    # Fechar conexão com o banco de dados
    cursor.close()
    db.close()

    return jsonify({
        'message': 'Prestador de serviços cadastrado com sucesso!',
        'prestador_id': prestador_id,  # Retorna o ID do prestador
        'redirect': url_for('prestador_servico'),
        'success': True
    })



# Rota para a página de cadastro de prestador
@app.route('/cadastro_prestador', methods=['GET'])
def cadastro_prestador():
    return render_template('cadastro_prestador.html')


# Rota para a página de detalhes do serviço
@app.route('/prestador_servico', methods=['GET'])
def prestador_servico():
    prestador_id = session.get('prestador_id')  # Ou qualquer outro método para obter o ID do prestador
    print(f'o que está indo: {prestador_id}')
    # Consultar o tipo de serviço do prestador no banco de dados

    # Consultar o tipo de serviço e o nome do prestador no banco de dados
    cursor.execute("SELECT servico, nome FROM prestadores WHERE prestador_id = %s", (prestador_id,))
    resultado = cursor.fetchone()

    # Se o prestador tiver um serviço e nome cadastrados, extraia os valores
    if resultado:
        servico = resultado[0]  # O primeiro valor é o 'servico'
        nome_prestador = resultado[1]  # O segundo valor é o 'nome'
        
        # Mapeia o serviço para o valor legível
        service_type_legivel = SERVICE_LABELS.get(servico, "Serviço Desconhecido")
        
        # Debug para verificar os valores
        print(f'Serviço: {service_type_legivel}, Nome: {nome_prestador}')
    else:
        service_type_legivel = "Serviço não informado"
        nome_prestador = "Nome não informado"

    return render_template('prestador_servico.html', 
                           prestador_id=prestador_id, 
                           service_type_legivel=service_type_legivel, 
                           nome_prestador=nome_prestador)

# Rota para tratar a solicitação de serviço do prestador
@app.route('/api/cadastrar-servico', methods=['POST'])
def api_prestador_solicitar_servico():
    try:
        # Coletar dados do formulário
        data = request.form
        prestador_id = data.get('prestadorId')  # Obter o ID do prestador do formulário
        service_type_legivel = data.get('serviceType')  # Este é o valor legível recebido do front-end
        description = data.get('description')
        budget = data.get('budget')
        urgency = data.get('urgency')
        location = data.get('location')  # CEP
        street = data.get('street')  # Rua
        neighborhood = data.get('neighborhood')  # Bairro
        city = data.get('city')  # Cidade
        state = data.get('state')  # Estado
        contact_method = data.get('contactMethod')  # Método de contato escolhido (email, telefone, whatsapp)
        contact_detail = data.get('contactDetail')  # Detalhe do contato (email, número de telefone, número do WhatsApp)
        comments = data.get('comments')
        provider_preferences = data.get('providerPreferences')

        # Processar os dias e horários de contato
        contact_days_and_times = data.get('contactDaysAndTimes')
        if contact_days_and_times:
            contact_days_and_times = json.loads(contact_days_and_times)  # Decodifica o JSON enviado pelo front-end
        else:
            contact_days_and_times = []

        # Validar se pelo menos um dia e horário foram selecionados
        if not contact_days_and_times:
            return jsonify({
                'message': 'Por favor, selecione pelo menos um dia e horário de contato.',
                'success': False
            }), 400

        # Formatar os dias e horários para salvar no banco
        formatted_contact_date = "; ".join([f"{item['day']} {item['time']}" for item in contact_days_and_times])

        # Mapeamento reverso: pegar a chave correspondente ao valor legível
        SERVICE_LABELS_REVERSE = {v: k for k, v in SERVICE_LABELS.items()}
        service_type = SERVICE_LABELS_REVERSE.get(service_type_legivel, None)

        # Verificar se o valor legível corresponde a uma chave válida
        if not service_type:
            return jsonify({
                'message': 'Tipo de serviço inválido.',
                'success': False
            }), 400  # Código de erro HTTP 400 - Bad Request

        # Verificar se já existe o mesmo serviço cadastrado para o prestador
        cursor.execute("""
            SELECT id FROM servicos WHERE prestador_id = %s AND tipo_servico = %s
        """, (prestador_id, service_type))
        
        duplicata = cursor.fetchone()
        if duplicata:
            return jsonify({
                'message': 'O prestador já possui um serviço desse tipo cadastrado.',
                'success': False
            }), 400

        # Atualizar método de contato na tabela `prestadores`
        cursor.execute("""
            UPDATE bd_servicos.prestadores
            SET contato = %s
            WHERE prestador_id = %s
        """, (contact_detail, prestador_id))
        db.commit()

        # Inserir o novo serviço na tabela `servicos`
        cursor.execute("""
            INSERT INTO bd_servicos.servicos (
                prestador_id, tipo_servico, descricao, orcamento, urgencia, localizacao, 
                rua, bairro, cidade, estado, metodo_contato, data_contato, comentarios, preferencias_prestador
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            prestador_id, service_type, description, budget, urgency, location,
            street, neighborhood, city, state, contact_method, formatted_contact_date, comments, provider_preferences
        ))
        db.commit()

        # Processar os certificados carregados
        certificados = request.files.getlist('certificados')
        for certificado in certificados:
            if certificado and certificado.filename != '':
                # Verificar duplicidade
                cursor.execute("""
                    SELECT id FROM bd_servicos.uploads 
                    WHERE prestador_id = %s AND tipo_certificado = %s AND tipo_arquivo = 'certificado'
                """, (prestador_id, certificado.filename))
                duplicado = cursor.fetchone()

                if duplicado:
                    print(f"Certificado {certificado.filename} já existe. Pulando inserção.")
                    continue

                # Inserir o novo certificado
                certificado_binario = certificado.read()
                cursor.execute("""
                    INSERT INTO bd_servicos.uploads (prestador_id, arquivo, tipo_arquivo, tipo_certificado, created_at)
                    VALUES (%s, %s, 'certificado', %s, NOW())
                """, (prestador_id, certificado_binario, certificado.filename))
        
        db.commit()

        return jsonify({
            'message': 'Serviço enviado com sucesso!',
            'redirect': url_for('upload_midia'),
            'success': True
        })

    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({
            'message': 'Erro ao processar a solicitação.',
            'success': False
        }), 500


# ------------------------------------
# Rotas para Upload de Mídia
# ------------------------------------
@app.route('/upload_midia', methods=['GET'])
def upload_midia():
    return render_template('upload_midia.html')

@app.route('/api/upload-midia', methods=['POST'])
def api_upload_midia():
    prestador_id = session.get('prestador_id')  # Pega o prestador_id diretamente da sessão
    documents = request.files.getlist('documents')
    video = request.files.get('video')
    perfil_foto = request.files.get('perfil_foto')  # Campo para a foto de perfil

    # Salvar a foto de perfil, se houver
    if perfil_foto:
        perfil_foto_binario = perfil_foto.read()  # Lê o conteúdo binário do arquivo
        cursor.execute(
            "INSERT INTO uploads (prestador_id, arquivo, tipo_arquivo, perfil_foto) VALUES (%s, %s, %s, %s)",
            (prestador_id, perfil_foto_binario, 'imagem', 'perfil')
        )
        db.commit()

    # Salvar os arquivos de imagem (documentos)
    for document in documents:
        document_binario = document.read()  # Lê o conteúdo binário do arquivo
        cursor.execute(
            "INSERT INTO uploads (prestador_id, arquivo, tipo_arquivo) VALUES (%s, %s, %s)",
            (prestador_id, document_binario, 'imagem')
        )
        db.commit()

    # Salvar o arquivo de vídeo, se houver
    if video:
        video_binario = video.read()  # Lê o conteúdo binário do arquivo
        cursor.execute(
            "INSERT INTO uploads (prestador_id, arquivo, tipo_arquivo) VALUES (%s, %s, %s)",
            (prestador_id, video_binario, 'video')
        )
        db.commit()

    return jsonify({
        'message': 'Mídia enviada com sucesso!',
        'redirect': url_for('login_page')  # Adiciona a URL de redirecionamento no JSON
    })


# @app.route('/get_image/<int:image_id>')
# def get_image(image_id):
#     cursor.execute("SELECT arquivo FROM uploads WHERE id = %s AND tipo_arquivo = 'imagem'", (image_id,))
#     image = cursor.fetchone()
#     if image:
#         return send_file(io.BytesIO(image['arquivo']), mimetype='image/jpeg')
#     else:
#         return 'Imagem não encontrada', 404

# @app.route('/get_video/<int:video_id>')
# def get_video(video_id):
#     cursor.execute("SELECT arquivo FROM uploads WHERE id = %s AND tipo_arquivo = 'video'", (video_id,))
#     video = cursor.fetchone()
#     if video:
#         return send_file(io.BytesIO(video['arquivo']), mimetype='video/mp4')
#     else:
#         return 'Vídeo não encontrado', 404



# Inicializar a aplicação
# ------------------------------------
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')

