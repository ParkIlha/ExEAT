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


def create_app():
    app = Flask(__name__)

    # CORS: React 개발서버(Vite=5173, CRA=3000)에서 호출 허용
    CORS(app, origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ])

    # 라우터 등록 — 모든 API는 /api 로 시작
    app.register_blueprint(health_bp, url_prefix="/api")

    return app


if __name__ == "__main__":
    app = create_app()

    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_ENV", "production") == "development"

    print(f"\n🚪 ExEAT 서버 시작: http://localhost:{port}")
    print(f"   헬스체크: http://localhost:{port}/api/health\n")

    app.run(host="0.0.0.0", port=port, debug=debug)
app = Flask(__name__)
app.json.ensure_ascii = False  # 한글 그대로 출력