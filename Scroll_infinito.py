import mysql.connector
import os
from dotenv import load_dotenv
from flask import Flask, render_template, jsonify, request, send_file, make_response
from io import BytesIO  # Para servir dados binários

app = Flask(__name__)

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

# Função de conexão com o banco de dados
def connect_to_db():
    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )
    return connection

# Função para buscar serviços do banco de dados
def get_services_from_db():
    db = connect_to_db()
    cursor = db.cursor(dictionary=True)  # Para retornar os dados como dicionários
    services = []
    
    # Consulta para obter dados de prestadores, serviços e uploads
    cursor.execute("SELECT * FROM bd_servicos.prestadores;")
    prestadores = cursor.fetchall()

    cursor.execute("SELECT * FROM bd_servicos.servicos;")
    servicos = cursor.fetchall()

    cursor.execute("SELECT * FROM bd_servicos.uploads;")
    uploads = cursor.fetchall()

    # Montar o JSON de serviços
    for prestador in prestadores:
        # Obter o serviço relacionado ao prestador
        prestador_servico = next((serv for serv in servicos if serv['prestador_id'] == prestador['id']), None)
        
        if prestador_servico:
            # Obter imagens e vídeos relacionados ao prestador
            images = [upload['id'] for upload in uploads if upload['prestador_id'] == prestador['id'] and upload['tipo_arquivo'] == 'imagem']
            videos = [upload['id'] for upload in uploads if upload['prestador_id'] == prestador['id'] and upload['tipo_arquivo'] == 'video']
            perfil_foto = next((upload['id'] for upload in uploads if upload['prestador_id'] == prestador['id'] and upload['tipo_arquivo'] == 'imagem' and upload['perfil_foto'] is not None), None)

            # Montar o serviço completo
            service = {
                "id": prestador['id'],
                "perfil_foto": perfil_foto,
                "name": prestador['nome'],
                "description": prestador_servico['descricao'],
                "images": images,
                "videos": videos,
                "person_name": prestador['nome'],
                "rating": None,  # Aqui você pode adicionar a lógica de avaliação se necessário
                "bio": prestador_servico['preferencias_prestador']
            }
            services.append(service)
    
    cursor.close()
    db.close()
    return services

# Rota principal para renderizar a página HTML
@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

# Rota para fornecer serviços paginados (scroll infinito)
@app.route('/get_services', methods=['GET'])
def get_services():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 5))

    all_services = get_services_from_db()
    start = (page - 1) * per_page
    end = start + per_page
    paginated_services = all_services[start:end]

    has_more = end < len(all_services)

    return jsonify({
        "services": paginated_services,
        "has_more": has_more
    })

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')



# import mysql.connector
# from flask import Flask, request, jsonify, render_template, redirect, url_for, session
# from dotenv import load_dotenv
# import os
# from werkzeug.security import generate_password_hash, check_password_hash

# # Carregar variáveis de ambiente do arquivo .env
# load_dotenv()

# app = Flask(__name__)

# # Configurar a chave secreta para a sessão
# app.secret_key = os.getenv('SECRET_KEY')  # Chave secreta para proteger os dados da sessão

# # ------------------------------------
# # Funções de Conexão com o Banco
# # ------------------------------------
# def connect_to_db():
#     connection = mysql.connector.connect(
#         host=os.getenv("DB_HOST"),
#         user=os.getenv("DB_USER"),
#         password=os.getenv("DB_PASSWORD"),
#         database=os.getenv("DB_NAME")
#     )
#     return connection

# db = connect_to_db()
# cursor = db.cursor()

# # ------------------------------------
# # Rotas para Clientes
# # ------------------------------------
# @app.route('/', methods=['GET'])
# def index():
#     return render_template('cadastro.html')
# # Rota para a página de cadastro de cliente
# @app.route('/cadastro_cliente', methods=['GET'])
# def cadastro_cliente():
#     return render_template('cadastro_cliente.html')

# @app.route('/login', methods=['GET'])
# def login_page():
#     return render_template('login.html')

# @app.route('/api/login', methods=['POST'])
# def login():
#     data = request.get_json()
#     email = data['email']
#     senha = data['password']

#     # Buscar o cliente pelo email
#     cursor.execute("SELECT id, senha FROM clientes WHERE email = %s", (email,))
#     result = cursor.fetchone()

#     if result and check_password_hash(result[1], senha):
#         # Armazene o ID do cliente na sessão
#         session['cliente_id'] = result[0]
#         return jsonify({'message': 'Login bem-sucedido'})
#     else:
#         return jsonify({'message': 'Credenciais inválidas'}), 401

# @app.route('/api/cadastrar-cliente', methods=['POST'])
# def cadastrar_cliente():
#     data = request.get_json()
#     nome = data['name']
#     email = data['email']
#     senha_hash = generate_password_hash(data['password'])  # Hash da senha
#     cnpj = data.get('cnpj', None)

#     cursor.execute(
#         "INSERT INTO clientes (nome, email, senha, cnpj) VALUES (%s, %s, %s, %s)",
#         (nome, email, senha_hash, cnpj)
#     )
#     db.commit()

#     return jsonify({
#         'message': 'Cliente cadastrado com sucesso!',
#         'redirect': url_for('solicitar_servico')
#     })

# # Rota para a página de solicitação de serviço
# @app.route('/solicitar_servico', methods=['GET'])
# def solicitar_servico():
#     # Obter o ID do cliente da sessão (caso ele tenha feito login)
#     cliente_id = session.get('cliente_id')
    
#     # Verifique se o cliente está logado (cliente_id existe na sessão)
#     if not cliente_id:
#         return redirect(url_for('login_page'))  # Redirecionar para a página de login se não estiver logado
#     print(f"Cliente ID: {cliente_id}")
    
#     # Exibir a página de solicitação de serviço
#     return render_template('solicitacao_servico.html', cliente_id=cliente_id)

# @app.route('/api/solicitar-servico', methods=['POST'])
# def api_solicitar_servico():
#     # Obter o ID do cliente da sessão
#     cliente_id = session.get('cliente_id')

#     if not cliente_id:
#         return jsonify({'message': 'Erro: Cliente não autenticado'}), 401

#     # Obter os dados do formulário
#     service_type = request.form.get('serviceType')
#     description = request.form.get('description')
#     budget = request.form.get('budget')
#     urgency = request.form.get('urgency')
#     location = request.form.get('location')
#     contact_method = request.form.get('contactMethod')
#     contact_date = request.form.get('contactDate')
#     comments = request.form.get('comments')
#     provider_preferences = request.form.get('providerPreferences')
#     references = request.files.get('references')  # Arquivo opcional

#     # Salvar o arquivo de referência, se existir
#     referencia_arquivo = None
#     if references:
#         referencia_arquivo = f'salvar/arquivos/{references.filename}'
#         references.save(referencia_arquivo)

#     # Inserir os dados no banco de dados
#     cursor.execute(
#         """
#         INSERT INTO servicos (cliente_id, tipo_servico, descricao, orcamento, urgencia, localizacao, 
#                               metodo_contato, data_contato, comentarios, preferencias_prestador, referencia_arquivo)
#         VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
#         """,
#         (cliente_id, service_type, description, budget, urgency, location, contact_method, contact_date,
#          comments, provider_preferences, referencia_arquivo)
#     )
#     db.commit()

#     return jsonify({
#         'message': 'Solicitação de serviço enviada com sucesso!'
#     })

# # ------------------------------------
# # Rotas para Prestadores
# # ------------------------------------
# @app.route('/api/cadastrar-prestador', methods=['POST'])
# def cadastrar_prestador():
#     data = request.get_json()
#     nome = data['name']
#     email = data['email']
#     senha_hash = generate_password_hash(data['password'])  # Hash da senha
#     servico = data['service']

#     cursor.execute(
#         "INSERT INTO prestadores (nome, email, senha, servico) VALUES (%s, %s, %s, %s)",
#         (nome, email, senha_hash, servico)
#     )
#     db.commit()

#     # Pegar o ID do prestador que acabou de ser inserido
#     prestador_id = cursor.lastrowid

#     # Armazenar o ID do prestador na sessão
#     session['prestador_id'] = prestador_id

#     return jsonify({
#         'message': 'Prestador de serviços cadastrado com sucesso!',
#         'prestador_id': prestador_id,  # Retorna o ID do prestador
#         'redirect': url_for('prestador_servico')
#     })


# # Rota para a página de cadastro de prestador
# @app.route('/cadastro_prestador', methods=['GET'])
# def cadastro_prestador():
#     return render_template('cadastro_prestador.html')


# # Rota para a página de detalhes do serviço
# @app.route('/prestador_servico', methods=['GET'])
# def prestador_servico():
#     prestador_id = session.get('prestador_id')  # Ou qualquer outro método para obter o ID do prestador
#     return render_template('prestador_servico.html', prestador_id=prestador_id)

# # Rota para tratar a solicitação de serviço do prestador
# @app.route('/api/cadastrar-servico', methods=['POST'])
# def api_prestador_solicitar_servico():
#     data = request.get_json()

#     # Coletar o ID do prestador (supondo que ele seja enviado pelo cliente ou que esteja logado)
#     prestador_id = data.get('prestadorId')  # Certifique-se de que o ID do prestador está sendo enviado corretamente
#     service_type = data.get('serviceType')
#     description = data.get('description')
#     budget = data.get('budget')
#     urgency = data.get('urgency')
#     location = data.get('location')
#     contact_method = data.get('contactMethod')
#     contact_date = data.get('contactDate')
#     comments = data.get('comments')
#     provider_preferences = data.get('providerPreferences')

#     # Inserir os dados no banco de dados, incluindo o prestador_id
#     cursor.execute(
#         """
#         INSERT INTO servicos (prestador_id, tipo_servico, descricao, orcamento, urgencia, localizacao, 
#                               metodo_contato, data_contato, comentarios, preferencias_prestador)
#         VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
#         """,
#         (prestador_id, service_type, description, budget, urgency, location, contact_method, contact_date,
#          comments, provider_preferences)
#     )
#     db.commit()

#     return jsonify({
#         'message': 'Serviço enviado com sucesso!',
#         'redirect': url_for('upload_midia')
#     })


# # ------------------------------------
# # Rotas para Upload de Mídia
# # ------------------------------------
# @app.route('/upload_midia', methods=['GET'])
# def upload_midia():
#     return render_template('upload_midia.html')

# @app.route('/api/upload-midia', methods=['POST'])
# def api_upload_midia():
#     prestador_id = session.get('prestador_id')  # Pega o prestador_id diretamente da sessão
#     documents = request.files.getlist('documents')
#     video = request.files.get('video')
#     perfil_foto = request.files.get('perfil_foto')  # Campo para a foto de perfil

#     # Salvar a foto de perfil, se houver
#     if perfil_foto:
#         perfil_foto_binario = perfil_foto.read()  # Lê o conteúdo binário do arquivo
#         cursor.execute(
#             "INSERT INTO uploads (prestador_id, arquivo, tipo_arquivo, perfil_foto) VALUES (%s, %s, %s, %s)",
#             (prestador_id, perfil_foto_binario, 'imagem', 'perfil')
#         )
#         db.commit()

#     # Salvar os arquivos de imagem (documentos)
#     for document in documents:
#         document_binario = document.read()  # Lê o conteúdo binário do arquivo
#         cursor.execute(
#             "INSERT INTO uploads (prestador_id, arquivo, tipo_arquivo) VALUES (%s, %s, %s)",
#             (prestador_id, document_binario, 'imagem')
#         )
#         db.commit()

#     # Salvar o arquivo de vídeo, se houver
#     if video:
#         video_binario = video.read()  # Lê o conteúdo binário do arquivo
#         cursor.execute(
#             "INSERT INTO uploads (prestador_id, arquivo, tipo_arquivo) VALUES (%s, %s, %s)",
#             (prestador_id, video_binario, 'video')
#         )
#         db.commit()

#     return jsonify({
#         'message': 'Mídia enviada com sucesso!'
#     })



# # Inicializar a aplicação
# if __name__ == '__main__':
#     app.run(debug=True, host='0.0.0.0')
