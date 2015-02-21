This a nonsensical website for keeping up with all your stuff and things.

To install the required python modules use requirements.txt with pip:

sudo pip install -r requirements.txt

After modules are installed:

python main.py

then via a browser*:

http://localhost:5000

*This hasn't been tested on IE and I suspect could be problematic on versions lower than 9. Use Chrome.

You must access from localhost on port 5000 for authentication to work since 'http:localhost:5000' is the only approved
origin for OAuth. You'll need a Google+ account to authenticate.

