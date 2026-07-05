"""API surface — auth, RBAC, and key endpoints."""


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_success_and_failure(client):
    ok = client.post("/api/auth/login", json={"email": "analyst@caspiandynamics.az", "password": "analyst123"})
    assert ok.status_code == 200
    assert ok.json()["role"] == "analyst"

    bad = client.post("/api/auth/login", json={"email": "analyst@caspiandynamics.az", "password": "nope"})
    assert bad.status_code == 401


def test_rbac_employee_blocked_from_analyst_endpoints(client, employee_headers):
    assert client.get("/api/employees", headers=employee_headers).status_code == 403
    assert client.get("/api/dashboard/analyst", headers=employee_headers).status_code == 403


def test_rbac_unauthenticated_rejected(client):
    assert client.get("/api/dashboard/analyst").status_code == 401


def test_analyst_can_read_dashboard(client, analyst_headers):
    r = client.get("/api/dashboard/analyst", headers=analyst_headers)
    assert r.status_code == 200
    body = r.json()
    assert "metrics" in body and "departments" in body
    assert len(body["departments"]) == 6


def test_employee_dashboard_has_gamification(client, employee_headers):
    r = client.get("/api/dashboard/employee", headers=employee_headers)
    assert r.status_code == 200
    g = r.json()["gamification"]
    assert "badges" in g and "team_leaderboard" in g
    assert len(g["badges"]) == 6


def test_quiz_answer_key_hidden_from_employee(client, employee_headers):
    assignments = client.get("/api/training/my", headers=employee_headers).json()
    for a in assignments:
        for q in a["module"]["quiz"]:
            assert "correct_index" not in q, "answer key must not leak to the quiz-taker"


def test_simulation_templates_multichannel(client, analyst_headers):
    r = client.get("/api/simulations/templates", headers=analyst_headers)
    assert r.status_code == 200
    channels = {t["channel"] for t in r.json()}
    assert {"email", "sms", "qr", "chat"} <= channels


def test_login_brute_force_throttle(client):
    # 10 failures allowed, then 429
    got_429 = False
    for _ in range(14):
        r = client.post("/api/auth/login", json={"email": "throttle@test.local", "password": "x"})
        if r.status_code == 429:
            got_429 = True
            break
    assert got_429, "login should throttle after repeated failures"
