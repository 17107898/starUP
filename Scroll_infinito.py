from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Rota principal para renderizar a página HTML
@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

# Simulação de dados de serviços (sem incluir "static/")
services = [
    {"id": 1, "name": "Serviço A", "description": "Descrição do serviço A", "images": ["images/foto_1.jpeg", "images/foto_2.jpeg"], "videos": ["videos/video_1.mp4"]},
    {"id": 2, "name": "Serviço B", "description": "Descrição do serviço B", "images": ["images/foto_3.jpeg"], "videos": ["videos/video_2.mp4"]},
    # Adicione mais serviços para simular uma lista maior
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
    app.run(debug=True)
