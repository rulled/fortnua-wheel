from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__)

DEFAULT_RANKS_CONFIG = {
    "E": {"name": "E-Ранг", "limit": 10},
    "D": {"name": "D-Ранг", "limit": 20},
    "C": {"name": "C-Ранг", "limit": 40},
    "B": {"name": "B-Ранг", "limit": 70},
    "A": {"name": "A-Ранг", "limit": 100},
    "S": {"name": "S-Ранг", "limit": 150},
    "NATIONAL": {"name": "Национальный Уровень", "limit": 300},
}

# Рассчитываем вероятности на основе лимитов, обеспечивая сумму 100%
def _calculate_initial_weights():
    weights = {}
    if not DEFAULT_RANKS_CONFIG:
        return {}

    total_limit = sum(r.get("limit", 0) for r in DEFAULT_RANKS_CONFIG.values())

    if total_limit == 0: # Если все лимиты 0, распределяем поровну
        num_ranks = len(DEFAULT_RANKS_CONFIG)
        if num_ranks == 0:
            return {}
        
        equal_weight = 100 / num_ranks
        current_sum_pct = 0
        keys = list(DEFAULT_RANKS_CONFIG.keys())
        for i, key in enumerate(keys):
            if i < num_ranks - 1:
                weights[key] = round(equal_weight, 2)
                current_sum_pct += weights[key]
            else: # Последний элемент получает остаток для суммы 100
                weights[key] = round(100 - current_sum_pct, 2)
        return weights

    # Расчет весов на основе лимитов
    current_sum_pct = 0
    keys = list(DEFAULT_RANKS_CONFIG.keys()) # Для последовательного порядка
    for i, key in enumerate(keys):
        data = DEFAULT_RANKS_CONFIG[key]
        limit = data.get("limit", 0)
        if i < len(keys) - 1:
            weight_pct = (limit / total_limit) * 100
            weights[key] = round(weight_pct, 2)
            current_sum_pct += weights[key]
        else:
            # Последний элемент получает остаток
            weights[key] = round(100 - current_sum_pct, 2)
    return weights

APP_WEIGHTS = _calculate_initial_weights()

@app.route('/')
def index():
    return render_template('index.html', ranks=DEFAULT_RANKS_CONFIG, weights=APP_WEIGHTS)

@app.route('/spin', methods=['POST'])
def spin():
    raw_weights = [r.get('limit', 0) for r in DEFAULT_RANKS_CONFIG.values()]
    
    if not DEFAULT_RANKS_CONFIG:
        return jsonify({"error": "Конфигурация рангов отсутствует"}), 500
    
    # Если все лимиты 0, выбираем случайно с равной вероятностью
    if not any(w > 0 for w in raw_weights):
        if not list(DEFAULT_RANKS_CONFIG.keys()): # Нет рангов
             return jsonify({"error": "Ранги не определены"}), 500
        role_key = random.choice(list(DEFAULT_RANKS_CONFIG.keys()))
    else:
        role_key = random.choices(list(DEFAULT_RANKS_CONFIG.keys()), weights=raw_weights, k=1)[0]
    
    role_data = DEFAULT_RANKS_CONFIG[role_key]
    return jsonify({"rank": role_data["name"], "percent": APP_WEIGHTS[role_key]})

if __name__ == '__main__':
    app.run(debug=True)