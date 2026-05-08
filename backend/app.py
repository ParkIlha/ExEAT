"""
ExEAT Flask 서버 진입점

각 기능별 라우터(Blueprint)를 등록하는 메인 파일.
실행: python app.py
"""

import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# 환경변수 로드 (.env 파일)
load_dotenv()

# Blueprint import
from routes.health import health_bp
from routes.trend import trend_bp
from routes.ask import ask_bp
from routes.cases import cases_bp
from routes.simulate import simulate_bp


def create_app():
    app = Flask(__name__)

    # 한글 응답이 \uXXXX 로 깨지지 않게
    app.json.ensure_ascii = False

    # CORS: React 개발서버(Vite=5173, CRA=3000)에서 호출 허용
    CORS(app, origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ])

    # 라우터 등록 — 모든 API 는 /api 로 시작
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(trend_bp, url_prefix="/api")
    app.register_blueprint(ask_bp, url_prefix="/api")
    app.register_blueprint(cases_bp, url_prefix="/api")
    app.register_blueprint(simulate_bp, url_prefix="/api")

    return app


if __name__ == "__main__":
    app = create_app()

    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_ENV", "production") == "development"

    print(f"\n🚪 ExEAT 서버 시작: http://localhost:{port}")
    print(f"   헬스체크: http://localhost:{port}/api/health")
    print(f"   트렌드:   POST http://localhost:{port}/api/trend\n")

    # macOS 환경에서 debug reloader(fsevents/watchdog)가 종종 터져서,
    # 개발 편의성보다 "항상 안정적으로 뜨는" 쪽을 우선한다.
    app.run(host="0.0.0.0", port=port, debug=debug, use_reloader=False)
