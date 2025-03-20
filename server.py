from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser
import socket
import sys

def get_free_port():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(('', 0))
    port = sock.getsockname()[1]
    sock.close()
    return port

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    print(f"\nServer started at http://localhost:{port}")
    print("Press Ctrl+C to stop the server...")
    
    # Open the browser automatically
    webbrowser.open(f'http://localhost:{port}')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down the server...")
        httpd.server_close()
        sys.exit(0)

if __name__ == '__main__':
    try:
        # Try the default port first
        port = 8000
        run_server(port)
    except OSError:
        # If default port is busy, find a free port
        print(f"Port {port} is in use, trying to find a free port...")
        port = get_free_port()
        run_server(port) 