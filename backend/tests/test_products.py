def test_products_requires_auth(client):
    response = client.get("/products")
    assert response.status_code == 401

def test_create_product(client, auth_headers):
    response = client.post(
        "/products",
        json={
            "name": "Producto Test",
            "price": 100,
            "stock": 10,
            "sku": "ABC123"
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Producto Test"
    
def test_sku_must_be_unique(client, auth_headers):
    payload = {
        "name": "Producto A",
        "price": 100,
        "stock": 10,
        "sku": "UNIQUE1"
    }

    r1 = client.post("/products", json=payload, headers=auth_headers)
    assert r1.status_code == 200

    r2 = client.post("/products", json=payload, headers=auth_headers)
    assert r2.status_code == 409
    
def test_users_cannot_see_other_users_products(client):
    # Usuario 1
    client.post("/auth/register", json={
        "email": "u1@test.com",
        "password": "123456"
    })
    r = client.post("/auth/login", data={
        "username": "u1@test.com",
        "password": "123456"
    })
    token1 = r.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Usuario 2
    client.post("/auth/register", json={
        "email": "u2@test.com",
        "password": "123456"
    })
    r = client.post("/auth/login", data={
        "username": "u2@test.com",
        "password": "123456"
    })
    token2 = r.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Usuario 1 crea producto
    r = client.post(
        "/products",
        json={
            "name": "Privado",
            "price": 100,
            "stock": 10,
            "sku": "PRIVATE1"
        },
        headers=headers1
    )
    product_id = r.json()["id"]

    # Usuario 2 intenta acceder
    r = client.get(f"/products/{product_id}", headers=headers2)

    assert r.status_code == 404