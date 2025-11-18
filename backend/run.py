from app import app

if __name__ == '__main__':
    print("🚀 Flask Backend Running on http://localhost:5000")
    print("💾 MongoDB Atlas connected")
    print("🤖 ML Eligibility Checker with Deep Learning initialized")
    app.run(debug=True, port=5000, host='0.0.0.0')
