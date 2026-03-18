from flask import Flask, render_template, request, send_file, jsonify
import pandas as pd
import os
import sys
import io
from datetime import datetime


def get_app_base_dir():
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def get_user_data_dir():
    local_app_data = os.environ.get("LOCALAPPDATA")

    if local_app_data:
        user_data_dir = os.path.join(local_app_data, "WooForgeTLS")
    else:
        user_data_dir = os.path.join(get_app_base_dir(), "user_data")

    os.makedirs(user_data_dir, exist_ok=True)
    return user_data_dir


BASE_DIR = get_app_base_dir()
USER_DATA_DIR = get_user_data_dir()
OUTPUT_FOLDER = os.path.join(USER_DATA_DIR, "output")

os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static")
)

COLUMNS = [
    "Type",
    "Name",
    "Published",
    "Is featured?",
    "Visibility in catalog",
    "Short description",
    "Description",
    "In stock?",
    "Backorders allowed?",
    "Sold individually?",
    "Allow customer reviews?",
    "Sale price",
    "Regular price",
    "Categories",
    "Images",
    "Download limit",
    "Download expiry days",
    "Position",
    "Download 1 name",
    "Download 1 URL",
    "Meta: rank_math_description",
    "Meta: rank_math_focus_keyword",
]


def get_value(values_list, index, default_value=""):
    if index < len(values_list):
        return values_list[index].strip()
    return default_value


def build_products_dataframe_from_form(form_data):
    types = form_data.getlist("type[]")
    names = form_data.getlist("name[]")
    published = form_data.getlist("published[]")
    featured = form_data.getlist("featured[]")
    visibility = form_data.getlist("visibility[]")
    short_descriptions = form_data.getlist("short_description[]")
    descriptions = form_data.getlist("description[]")
    in_stock = form_data.getlist("in_stock[]")
    backorders = form_data.getlist("backorders[]")
    sold_individually = form_data.getlist("sold_individually[]")
    reviews = form_data.getlist("reviews[]")
    sale_prices = form_data.getlist("sale_price[]")
    regular_prices = form_data.getlist("regular_price[]")
    categories = form_data.getlist("categories[]")
    images = form_data.getlist("images[]")
    download_limits = form_data.getlist("download_limit[]")
    download_expiry_days = form_data.getlist("download_expiry_days[]")
    positions = form_data.getlist("position[]")
    download_names = form_data.getlist("download_name[]")
    download_urls = form_data.getlist("download_url[]")
    seo_descriptions = form_data.getlist("seo_description[]")
    focus_keywords = form_data.getlist("focus_keyword[]")

    total_rows = max(
        len(types),
        len(names),
        len(published),
        len(featured),
        len(visibility),
        len(short_descriptions),
        len(descriptions),
        len(in_stock),
        len(backorders),
        len(sold_individually),
        len(reviews),
        len(sale_prices),
        len(regular_prices),
        len(categories),
        len(images),
        len(download_limits),
        len(download_expiry_days),
        len(positions),
        len(download_names),
        len(download_urls),
        len(seo_descriptions),
        len(focus_keywords),
    )

    data = []

    for i in range(total_rows):
        name_value = get_value(names, i, "")

        if not name_value:
            continue

        row = {
            "Type": get_value(types, i, "simple, downloadable, virtual"),
            "Name": name_value,
            "Published": get_value(published, i, "1"),
            "Is featured?": get_value(featured, i, "0"),
            "Visibility in catalog": get_value(visibility, i, "visible"),
            "Short description": get_value(short_descriptions, i, ""),
            "Description": get_value(descriptions, i, ""),
            "In stock?": get_value(in_stock, i, "1"),
            "Backorders allowed?": get_value(backorders, i, "0"),
            "Sold individually?": get_value(sold_individually, i, "0"),
            "Allow customer reviews?": get_value(reviews, i, "1"),
            "Sale price": get_value(sale_prices, i, ""),
            "Regular price": get_value(regular_prices, i, ""),
            "Categories": get_value(categories, i, "Classic TV"),
            "Images": get_value(images, i, ""),
            "Download limit": get_value(download_limits, i, "-1"),
            "Download expiry days": get_value(download_expiry_days, i, "-1"),
            "Position": get_value(positions, i, "0"),
            "Download 1 name": get_value(download_names, i, ""),
            "Download 1 URL": get_value(download_urls, i, ""),
            "Meta: rank_math_description": get_value(seo_descriptions, i, ""),
            "Meta: rank_math_focus_keyword": get_value(focus_keywords, i, ""),
        }

        data.append(row)

    if not data:
        return None

    df = pd.DataFrame(data, columns=COLUMNS)
    return df


@app.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({
        "status": "ok",
        "app": "WooForgeTLS"
    })


@app.route("/api/export-csv-data", methods=["POST"])
def export_csv_data():
    try:
        df = build_products_dataframe_from_form(request.form)

        if df is None:
            return jsonify({
                "success": False,
                "message": "Debes añadir al menos un producto con Name."
            }), 400

        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_text = csv_buffer.getvalue()

        suggested_filename = f"wooforge_tls_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

        return jsonify({
            "success": True,
            "filename": suggested_filename,
            "csv_text": csv_text
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        df = build_products_dataframe_from_form(request.form)

        if df is None:
            return render_template("index.html", error="Debes añadir al menos un producto con Name.")

        filename = f"wooforge_tls_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        filepath = os.path.join(OUTPUT_FOLDER, filename)

        df.to_csv(filepath, index=False, encoding="utf-8-sig")

        return send_file(filepath, as_attachment=True)

    return render_template("index.html", error=None)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)