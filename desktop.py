import threading
import time
import urllib.request
import webview

from waitress import serve
from app import app
# comment 

main_window = None


class DesktopApi:
    def save_csv_file(self, csv_text, suggested_filename):
        global main_window

        if main_window is None:
            return {
                "success": False,
                "message": "La ventana principal no está disponible."
            }

        try:
            file_types = ("CSV Files (*.csv)", "All files (*.*)")

            selected_path = main_window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=suggested_filename,
                file_types=file_types
            )

            if not selected_path:
                return {
                    "success": False,
                    "cancelled": True,
                    "message": "Guardado cancelado por el usuario."
                }

            if isinstance(selected_path, (list, tuple)):
                final_path = selected_path[0]
            else:
                final_path = selected_path

            with open(final_path, "w", encoding="utf-8-sig", newline="") as file:
                file.write(csv_text)

            return {
                "success": True,
                "cancelled": False,
                "message": "Guardado satisfactoriamente.",
                "path": final_path
            }
        except Exception as e:
            return {
                "success": False,
                "cancelled": False,
                "message": str(e)
            }

    def save_json_file(self, json_text, suggested_filename):
        global main_window

        if main_window is None:
            return {
                "success": False,
                "message": "La ventana principal no está disponible."
            }

        try:
            file_types = ("JSON Files (*.json)", "All files (*.*)")

            selected_path = main_window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=suggested_filename,
                file_types=file_types
            )

            if not selected_path:
                return {
                    "success": False,
                    "cancelled": True,
                    "message": "Guardado cancelado por el usuario."
                }

            if isinstance(selected_path, (list, tuple)):
                final_path = selected_path[0]
            else:
                final_path = selected_path

            with open(final_path, "w", encoding="utf-8") as file:
                file.write(json_text)

            return {
                "success": True,
                "cancelled": False,
                "message": "Guardado satisfactoriamente.",
                "path": final_path
            }
        except Exception as e:
            return {
                "success": False,
                "cancelled": False,
                "message": str(e)
            }


def run_server():
    serve(app, host="127.0.0.1", port=5000)


def wait_for_server():
    for _ in range(60):
        try:
            with urllib.request.urlopen("http://127.0.0.1:5000/api/ping", timeout=1) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)

    return False


def main():
    global main_window

    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    server_ready = wait_for_server()

    if not server_ready:
        raise RuntimeError("No se pudo iniciar el servidor local de WooForgeTLS.")

    api = DesktopApi()

    main_window = webview.create_window(
        "WooForgeTLS",
        "http://127.0.0.1:5000/",
        width=1440,
        height=920,
        min_size=(1100, 720),
        js_api=api
    )

    webview.start()


if __name__ == "__main__":
    main()