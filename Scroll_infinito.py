import mysql.connector
import os
from dotenv import load_dotenv
from io import BytesIO  # Para servir dados binários
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, make_response, send_file
from werkzeug.security import generate_password_hash, check_password_hash

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

def get_services_from_db(service_type=None, cep=None, street=None, neighborhood=None, city=None, state=None, urgency=None):
    # Log dos parâmetros recebidos
    print(f"Recebendo parâmetros: service_type={service_type}, cep={cep}, street={street}, neighborhood={neighborhood}, city={city}, state={state}, urgency={urgency}")

    db = connect_to_db()
    cursor = db.cursor(dictionary=True)

    query = """
    SELECT prestadores.id AS prestador_id, prestadores.nome, servicos.tipo_servico AS servico, servicos.descricao, servicos.preferencias_prestador, uploads.id AS upload_id, uploads.tipo_arquivo, uploads.perfil_foto,
           servicos.localizacao, servicos.rua, servicos.bairro, servicos.cidade, servicos.estado
    FROM bd_servicos.prestadores
    JOIN bd_servicos.servicos ON prestadores.id = servicos.prestador_id
    LEFT JOIN bd_servicos.uploads ON prestadores.id = uploads.prestador_id
    WHERE 1=1
    """
    
    params = []
    
    # Filtro por tipo de serviço
    if service_type:
        query += " AND servicos.tipo_servico = %s"
        params.append(service_type)

    # Filtro por urgência
    if urgency:
        query += " AND servicos.urgencia = %s"
        params.append(urgency)

    # Prioridade de localização: Primeiro CEP, depois bairro, depois cidade, depois estado
    if cep:
        query += """
        ORDER BY (servicos.localizacao = %s) DESC, 
                 (servicos.bairro = %s) DESC, 
                 (servicos.cidade = %s) DESC, 
                 (servicos.estado = %s) DESC
        """
        params.extend([cep, neighborhood, city, state])

    # Log da query e parâmetros
    print(f"Query final: {query}")
    print(f"Parâmetros da query: {params}")

    # Executar a query
    cursor.execute(query, params)
    prestadores_servicos_uploads = cursor.fetchall()

    # Log do número de resultados encontrados
    print(f"Número de resultados encontrados: {len(prestadores_servicos_uploads)}")

    services = []
    prestadores_ids = set()

    for prestador in prestadores_servicos_uploads:
        if prestador['prestador_id'] not in prestadores_ids:
            prestadores_ids.add(prestador['prestador_id'])

            # Obter perfil, imagens e vídeos do prestador
            perfil_foto = next((upload['upload_id'] for upload in prestadores_servicos_uploads
                                if upload['prestador_id'] == prestador['prestador_id'] and
                                upload['tipo_arquivo'] == 'imagem' and upload['perfil_foto'] is not None), None)

            images = [upload['upload_id'] for upload in prestadores_servicos_uploads
                      if upload['prestador_id'] == prestador['prestador_id'] and upload['tipo_arquivo'] == 'imagem' and
                      upload['upload_id'] != perfil_foto]

            videos = [upload['upload_id'] for upload in prestadores_servicos_uploads
                      if upload['prestador_id'] == prestador['prestador_id'] and upload['tipo_arquivo'] == 'video']
                    # Mapeia o serviço para o valor legível
            service_type_legivel = SERVICE_LABELS.get(prestador['servico'], "Serviço Desconhecido")
            # Criar objeto de serviço completo
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
                "rating": None,
                "bio": prestador['preferencias_prestador']
            }
            services.append(service)

    # Log do número de serviços retornados
    print(f"Número de serviços retornados: {len(services)}")

    cursor.close()
    db.close()

    return services



# Rota principal para renderizar a página HTML
@app.route('/carrossel', methods=['GET'])
def carrossel():
    service_type = request.args.get('serviceType')
    cep = request.args.get('cep')  # Novo parâmetro
    street = request.args.get('street')  # Novo parâmetro
    neighborhood = request.args.get('neighborhood')  # Novo parâmetro
    city = request.args.get('city')  # Novo parâmetro
    state = request.args.get('state')  # Novo parâmetro
    urgency = request.args.get('urgency')

    # Log para verificar os filtros recebidos
    print(f"Rota /carrossel - Filtros recebidos: serviceType={service_type}, cep={cep}, neighborhood={neighborhood}, city={city}, state={state}, urgency={urgency}")
    
    # Renderiza a página de carrossel com os novos filtros aplicados
    return render_template(
        'index.html', 
        serviceType=service_type, 
        cep=cep, 
        street=street, 
        neighborhood=neighborhood, 
        city=city, 
        state=state, 
        urgency=urgency
    )
# Rota para fornecer serviços paginados (scroll infinito)
@app.route('/get_services', methods=['GET'])
def get_services():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 5))
    
    # Obter filtros da URL
    service_type = request.args.get('serviceType')
    cep = request.args.get('cep')  # Novo parâmetro
    street = request.args.get('street')  # Novo parâmetro
    neighborhood = request.args.get('neighborhood')  # Novo parâmetro
    city = request.args.get('city')  # Novo parâmetro
    state = request.args.get('state')  # Novo parâmetro
    urgency = request.args.get('urgency')

    # Log para verificar os filtros recebidos
    print(f"Rota /get_services - Filtros recebidos: serviceType={service_type}, cep={cep}, neighborhood={neighborhood}, city={city}, state={state}, urgency={urgency}")
    print(f"Paginação - Página: {page}, Serviços por página: {per_page}")

    # Buscar serviços filtrados com base nas preferências do cliente
    all_services = get_services_from_db(service_type, cep, street, neighborhood, city, state, urgency)
    
    # Log para verificar quantos serviços foram encontrados antes da paginação
    print(f"Total de serviços encontrados (antes da paginação): {len(all_services)}")
    
    start = (page - 1) * per_page
    end = start + per_page
    paginated_services = all_services[start:end]

    # Log para verificar quantos serviços foram paginados
    print(f"Total de serviços retornados na página atual: {len(paginated_services)}")

    has_more = end < len(all_services)

    # Log para verificar se há mais serviços para carregar
    print(f"Mais serviços a carregar? {'Sim' if has_more else 'Não'}")

    return jsonify({
        "services": paginated_services,
        "has_more": has_more
    })
@app.route('/perfil_prestador', methods=['GET'])
def perfil_prestador():
    prestador_id = request.args.get('prestador_id')
    
    # Conectar ao banco e usar cursor padrão
    db = connect_to_db()  # Conexão ao banco de dados
    cursor = db.cursor(dictionary=True)  # Usando dictionary=True para retornar resultados como dicionários

    # Consulta ao banco de dados para obter os dados do prestador e seus serviços
    cursor.execute("""
        SELECT prestadores.id AS prestador_id, 
               prestadores.nome, 
               prestadores.email, 
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
               servicos.preferencias_prestador, 
               uploads.id AS upload_id, 
               uploads.tipo_arquivo, 
               uploads.perfil_foto
        FROM bd_servicos.prestadores
        JOIN bd_servicos.servicos 
            ON prestadores.id = servicos.prestador_id
        LEFT JOIN bd_servicos.uploads 
            ON prestadores.id = uploads.prestador_id
        WHERE prestadores.id = %s
    """, (prestador_id,))
    
    prestador = cursor.fetchall()

    cursor.close()
    db.close()

    # Verificar se o prestador foi encontrado
    if not prestador:
        return "Prestador não encontrado", 404

    # Exemplo de acesso usando os dicionários
    prestador_dados = {
        'nome': prestador[0]['nome'],
        'email': prestador[0]['email'],
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
        'data_contato': prestador[0]['data_contato'],
        'comentarios': prestador[0]['comentarios'],
        'preferencias_prestador': prestador[0]['preferencias_prestador'],
    }

    # Selecionar a foto de perfil (se houver)
    perfil_foto = next((upload['upload_id'] for upload in prestador
                    if upload['tipo_arquivo'] == 'imagem' and upload['perfil_foto'] is not None), None)

    # Separar os uploads em imagens (excluindo a foto de perfil) e vídeos
    images = [upload['upload_id'] for upload in prestador
                if upload['tipo_arquivo'] == 'imagem' and upload['upload_id'] != perfil_foto]

    videos = [upload['upload_id'] for upload in prestador
                if upload['tipo_arquivo'] == 'video']

    # Renderizar a página de perfil do prestador com os dados
    return render_template('perfil_prestador.html', prestador=prestador_dados, perfil_foto=perfil_foto, images=images, videos=videos)

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

    # Buscar o cliente pelo email
    cursor.execute("SELECT id, senha FROM clientes WHERE email = %s", (email,))
    result = cursor.fetchone()

    if result and check_password_hash(result[1], senha):
        # Armazene o ID do cliente na sessão
        session['cliente_id'] = result[0]
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

    # Verificar se o ID do cliente já está cadastrado (supondo que o ID seja fornecido pelo cliente)
    cliente_id = data.get('cliente_id', None)
    cliente_existente_id = None
    if cliente_id:
        cursor.execute("SELECT id FROM clientes WHERE id = %s", (cliente_id,))
        cliente_existente_id = cursor.fetchone()

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

    # Inserir o novo cliente no banco de dados
    cursor.execute(
        "INSERT INTO clientes (nome, email, senha, cnpj) VALUES (%s, %s, %s, %s)",
        (nome, email, senha_hash, cnpj)
    )
    db.commit()

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
        return redirect(url_for('login_page'))  # Redirecionar para a página de login se não estiver logado
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

    # Salvar o arquivo de referência, se existir
    referencia_arquivo = None
    if references:
        referencia_arquivo = f'salvar/arquivos/{references.filename}'
        references.save(referencia_arquivo)

    # Verificar se já existe uma solicitação de serviço para este cliente e tipo de serviço
    cursor.execute("""
        SELECT id FROM servicos WHERE cliente_id = %s AND tipo_servico = %s
    """, (cliente_id, service_type))
    servico_existente = cursor.fetchone()

    if servico_existente:
        # Se já existir um serviço do mesmo tipo para este cliente, retornar erro
        return jsonify({
            'message': 'Você já solicitou este tipo de serviço. Por favor, aguarde o processamento ou entre em contato para mais informações.',
            'success': False
        }), 400  # Código de erro HTTP 400 - Bad Request

    # Inserir os dados no banco de dados, incluindo as informações de endereço
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

    # Redirecionar para a página principal com os filtros aplicados
    return redirect(url_for('carrossel', serviceType=service_type, cep=cep, street=street, neighborhood=neighborhood, city=city, state=state, urgency=urgency))


# ------------------------------------
# Rotas para Prestadores
# ------------------------------------
@app.route('/api/cadastrar-prestador', methods=['POST'])
def cadastrar_prestador():
    data = request.get_json()
    nome = data['name']
    email = data['email']
    senha_hash = generate_password_hash(data['password'])  # Hash da senha
    servico = data['service']

    # Verificar se o e-mail já está cadastrado
    cursor.execute("SELECT id FROM prestadores WHERE email = %s", (email,))
    prestador_existente_email = cursor.fetchone()

    if prestador_existente_email:
        # Se o e-mail já estiver cadastrado, retornar uma mensagem de erro
        return jsonify({
            'message': 'O e-mail já está cadastrado. Tente fazer login ou use outro e-mail.',
            'success': False
        }), 400  # Código de erro HTTP 400 - Bad Request

    # Inserir o novo prestador no banco de dados (o ID será gerado automaticamente)
    cursor.execute(
        "INSERT INTO prestadores (nome, email, senha, servico) VALUES (%s, %s, %s, %s)",
        (nome, email, senha_hash, servico)
    )
    db.commit()

    # Pegar o ID do prestador que acabou de ser inserido
    prestador_id = cursor.lastrowid

    # Armazenar o ID do prestador na sessão
    session['prestador_id'] = prestador_id

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

    # Consultar o tipo de serviço do prestador no banco de dados

    # Consultar o tipo de serviço e o nome do prestador no banco de dados
    cursor.execute("SELECT servico, nome FROM prestadores WHERE id = %s", (prestador_id,))
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
# Rota para tratar a solicitação de serviço do prestador
@app.route('/api/cadastrar-servico', methods=['POST'])
def api_prestador_solicitar_servico():
    data = request.get_json()

    # Coletar o ID do prestador e os outros dados enviados
    prestador_id = data.get('prestadorId')
    service_type_legivel = data.get('serviceType')  # Este é o valor legível recebido do front-end
    description = data.get('description')
    budget = data.get('budget')
    urgency = data.get('urgency')
    location = data.get('location')  # CEP
    street = data.get('street')  # Rua
    neighborhood = data.get('neighborhood')  # Bairro
    city = data.get('city')  # Cidade
    state = data.get('state')  # Estado
    contact_method = data.get('contactMethod')
    contact_date = data.get('contactDate')
    comments = data.get('comments')
    provider_preferences = data.get('providerPreferences')

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
    
    # Verificar se a consulta retornou algum resultado (significa que já existe esse serviço)
    duplicata = cursor.fetchone()
    
    if duplicata:
        # Se já existir um serviço do mesmo tipo para este prestador, retornar erro
        return jsonify({
            'message': 'O prestador já possui um serviço desse tipo cadastrado.',
            'success': False
        }), 400  # Código de erro HTTP 400 - Bad Request

    # Inserir os dados no banco de dados, incluindo o prestador_id e as novas informações de endereço
    cursor.execute(
        """
        INSERT INTO servicos (prestador_id, tipo_servico, descricao, orcamento, urgencia, localizacao, 
                              rua, bairro, cidade, estado, metodo_contato, data_contato, comentarios, preferencias_prestador)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (prestador_id, service_type, description, budget, urgency, location, 
         street, neighborhood, city, state, contact_method, contact_date, comments, provider_preferences)
    )
    db.commit()

    return jsonify({
        'message': 'Serviço enviado com sucesso!',
        'redirect': url_for('upload_midia'),
        'success': True
    })



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
        'message': 'Mídia enviada com sucesso!'
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

