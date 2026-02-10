from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine, get_db
from . import crud, schemas, models
from datetime import date
from fastapi import Query
from fastapi.responses import StreamingResponse
import csv
import io

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Stock App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/products", response_model=schemas.ProductOut)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    return crud.create_product(db, payload)

@app.get("/products", response_model=list[schemas.ProductOut])
def list_products(db: Session = Depends(get_db)):
    return crud.list_products(db)

@app.get("/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = crud.get_product(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p

@app.patch("/products/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
    p = crud.update_product(db, product_id, payload)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p

@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_product(db, product_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"deleted": True}

@app.post("/sales", response_model=schemas.SaleOut)
def create_sale(payload: schemas.SaleCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_sale(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/sales", response_model=list[schemas.SaleOut])
def list_sales(db: Session = Depends(get_db)):
    return crud.list_sales(db)

@app.get("/reports/sales/summary")
def report_sales_summary(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
):
    return crud.sales_summary(db, from_date, to_date)


@app.get("/reports/sales/export.csv")
def report_sales_export_csv(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
):
    rows = crud.sales_rows_for_csv(db, from_date, to_date)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "sale_id",
        "sale_datetime",
        "payment_method",
        "product_id",
        "product_name",
        "qty",
        "unit_price",
        "line_total",
        "sale_total",
    ])
    writer.writeheader()
    writer.writerows(rows)

    output.seek(0)

    filename = f"ventas_{from_date}_a_{to_date}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
    
@app.get("/reports/sales/daily")
def report_sales_daily(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
):
    return {
        "from": str(from_date),
        "to": str(to_date),
        "days": crud.sales_daily(db, from_date, to_date),
    }


@app.get("/reports/sales/daily/export.csv")
def report_sales_daily_export_csv(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
):
    data = crud.sales_daily(db, from_date, to_date)

    # Armamos CSV con columnas: date, count_sales, total + cada payment_method
    all_methods = sorted({m for d in data for m in d["by_payment_method"].keys()})

    output = io.StringIO()
    fieldnames = ["date", "count_sales", "total"] + [f"pm_{m}" for m in all_methods]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for d in data:
        row = {
            "date": d["date"],
            "count_sales": d["count_sales"],
            "total": d["total"],
        }
        for m in all_methods:
            row[f"pm_{m}"] = d["by_payment_method"].get(m, 0.0)
        writer.writerow(row)

    output.seek(0)
    filename = f"ventas_diarias_{from_date}_a_{to_date}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )