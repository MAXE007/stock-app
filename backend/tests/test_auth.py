def test_register_and_login(client):
    # register
    response = client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "123456"
    })
    assert response.status_code == 200

    # login
    response = client.post("/auth/login", data={
        "username": "test@example.com",
        "password": "123456"
    })
    assert response.status_code == 200

    data = response.json()
    assert "access_token" in data