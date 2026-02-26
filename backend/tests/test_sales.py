def test_sale_reduces_stock(client, auth_headers):
    # 1️⃣ Crear producto
    r = client.post(
        "/products",
        json={
            "name": "Producto Test",
            "price": 100,
            "stock": 10,
            "sku": "SALE1"
        },
        headers=auth_headers
    )
    assert r.status_code == 200
    product_id = r.json()["id"]

    # 2️⃣ Crear venta
    r = client.post(
        "/sales",
        json={
            "items": [
                {"product_id": product_id, "qty": 2}
            ],
            "payment_method": "cash"
        },
        headers=auth_headers
    )
    assert r.status_code == 200

    # 3️⃣ Verificar que el stock bajó
    r = client.get(f"/products/{product_id}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["stock"] == 8
    
def test_cannot_sell_more_than_stock(client, auth_headers):
    # Crear producto con stock 5
    r = client.post(
        "/products",
        json={
            "name": "Producto Stock Limit",
            "price": 100,
            "stock": 5,
            "sku": "LIMIT1"
        },
        headers=auth_headers
    )
    assert r.status_code == 200
    product_id = r.json()["id"]

    # Intentar vender 10 (más que el stock)
    r = client.post(
        "/sales",
        json={
            "items": [
                {"product_id": product_id, "qty": 10}
            ],
            "payment_method": "cash"
        },
        headers=auth_headers
    )

    assert r.status_code == 400