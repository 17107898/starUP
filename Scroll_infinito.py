from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Rota principal para renderizar a página HTML
@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

# Simulação de dados de serviços (sem incluir "static/")
services = [
    {
        "id": 1,
        "perfil_foto":"images/Perfil/perfil_1.jpeg",
        "name": "Serviço A",
        "description": "Descrição do serviço A. Um serviço completo voltado para consultoria de negócios.",
        "images": ["images/foto_1.jpeg", "images/foto_2.jpeg"],
        "videos": ["videos/video_1.mp4"],
        "person_name": "Jubileu",  # Nome da pessoa responsável pelo serviço A
        "rating": 4.7,  # Nota do serviço A
        "bio": "Jubileu é um consultor experiente, com mais de 10 anos de atuação em projetos de expansão de empresas. Ele deseja ajudar empresas a alcançar novos mercados e otimizar seus processos internos."
    },
    {
        "id": 2,
        "perfil_foto":"images/Perfil/perfil_2.jpg",
        "name": "Serviço B",
        "description": "Descrição do serviço B. Focado em desenvolvimento de websites e plataformas digitais.",
        "images": ["images/foto_3.jpeg"],
        "videos": ["videos/video_2.mp4"],
        "person_name": "Tubilu",  # Nome da pessoa responsável pelo serviço B
        "rating": 4.3,  # Nota do serviço B
        "bio": "Tubilu é um desenvolvedor web especializado em criar soluções modernas e responsivas para empresas que buscam uma presença digital marcante. Ele busca aprimorar a performance dos sites e a experiência do usuário."
    },
    # Adicione mais serviços simulados conforme necessário
]


# Rota para fornecer serviços paginados (scroll infinito)
@app.route('/get_services', methods=['GET'])
def get_services():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 5))

    start = (page - 1) * per_page
    end = start + per_page
    paginated_services = services[start:end]

    has_more = end < len(services)

    return jsonify({
        "services": paginated_services,
        "has_more": has_more
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
