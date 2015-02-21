from flask import Flask, render_template, request, redirect, url_for, jsonify, make_response, session
app = Flask(__name__)

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from database_setup import Base, Stuff, Things

import json
import random
import string

import httplib2
from oauth2client.client import AccessTokenRefreshError
from oauth2client.client import flow_from_clientsecrets
from oauth2client.client import FlowExchangeError

from simplekv.memory import DictStore
from flaskext.kvsession import KVSessionExtension

engine = create_engine('sqlite:///stuffnthings.db')
Base.metadata.bind = engine

DBSession = sessionmaker(bind=engine)
dsession = DBSession()

app = Flask(__name__)
app.secret_key = ''.join(random.choice(string.ascii_uppercase + string.digits)
                         for x in xrange(32))


# See the simplekv documentation for details
store = DictStore()


# This will replace the app's session handling
KVSessionExtension(store, app)


# Update client_secrets.json with your Google API project information.
# Do not change this assignment.
CLIENT_ID = json.loads(
    open('client_secrets.json', 'r').read())['web']['client_id']
#SERVICE = build('plus', 'v1')

#In the event I need to tweak this query later
def getAllStuff():
    return dsession.query(Stuff).all()

def getAllStuffInventory():
    return dsession.query(Stuff.id, Stuff.name, func.count(Things.stuff_id)).outerjoin(Things).group_by(Stuff.name).all()

@app.route('/')
def stuff():
    state = ''.join(random.choice(string.ascii_uppercase + string.digits)for x in xrange(32))
    session['state'] = state
    stuff = getAllStuff()
    things = dsession.query(Things).order_by(Things.id.desc()).limit(10)
    return render_template('main.html', stuff=stuff, things=things, CLIENT_ID=CLIENT_ID,STATE=state )

@app.route('/_get_stuff')
def getStuff():
    json = []
    for stuff in getAllStuffInventory():
        thingsList = []
        things = dsession.query(Things.name, Things.id).filter(Things.stuff_id==stuff[0]).all()
        for t in things:
            thingsList.append({'id' : t.id, 'name' : t.name})

        s = { 'id' : stuff[0],
             'name' : stuff[1],
             'count' : stuff[2],
             'things' : thingsList}
        json.append(s)
    print(json)

    return jsonify(Stuff=json)

@app.route('/addstuff', methods=['POST'])
def addStuff():
    if session.get('credentials') is None:
        return notLoggedIn()
    newStuff = Stuff(name = request.form['name'])
    dsession.add(newStuff)
    dsession.commit()
    return 'Success'

@app.route('/updatething', methods=['POST'])
def updateThing():
    if session.get('credentials') is None:
        return notLoggedIn()
    updateThing = dsession.query(Things).filter_by(id = request.form['id']).one()
    if request.form['name']:
        updateThing.name = request.form['name']
    if request.form['description']:
        updateThing.description = request.form['description']
    if request.form['quantity']:
        updateThing.quantity = request.form['quantity']
    if request.form['stuff_id']:
        updateThing.stuff_id = request.form['stuff_id']
    if request.form['base64img']:
        updateThing.image = request.form['base64img']
    dsession.add(updateThing)
    dsession.commit()
    return 'Success'

@app.route('/getthing', methods=['GET'])
def getThing():
    id = request.args.get('id')
    print(id)
    thing = dsession.query(Things).filter(Things.id == id).all()

    return jsonify(Thing=[t.serialize for t in thing])

@app.route('/deletething', methods=['POST'])
def deleteThing():
    if session.get('credentials') is None:
        return notLoggedIn()
    thingToDelete = dsession.query(Things).filter_by(id = request.form['id']).one()
    dsession.delete(thingToDelete)
    dsession.commit()
    return 'Success'

@app.route('/addthings', methods=['GET','POST'])
def addThings():
    if session.get('credentials') is None:
        return notLoggedIn()

    if request.method == 'POST':
        newThing = Things(name = request.form['name'], description = request.form['description'], quantity = request.form['quantity'], image = request.form['base64img'], stuff_id = request.form['stuff_id'])
        dsession.add(newThing)
        dsession.commit()
        return redirect(url_for('stuff'))
    else:
        stuff = getAllStuff()
        return render_template('addthings.html', stuff=stuff)

####### Code from Google example for OAuth ##########
@app.route('/connect', methods=['POST'])
def connect():
  """Exchange the one-time authorization code for a token and
  store the token in the session."""
  # Ensure that the request is not a forgery and that the user sending
  # this connect request is the expected user.
  print('state %s' % request.args.get('state', ''))
  if request.args.get('state', '') != session['state']:
    response = make_response(json.dumps('Invalid state parameter.'), 401)
    response.headers['Content-Type'] = 'application/json'
    return response
  # Normally, the state is a one-time token; however, in this example,
  # we want the user to be able to connect and disconnect
  # without reloading the page.  Thus, for demonstration, we don't
  # implement this best practice.
  #del session['state']

  code = request.data
  print('code %s' % code)
  try:
    # Upgrade the authorization code into a credentials object
    oauth_flow = flow_from_clientsecrets('client_secrets.json', scope='')
    oauth_flow.redirect_uri = 'postmessage'
    credentials = oauth_flow.step2_exchange(code)
    print credentials
  except FlowExchangeError:
    response = make_response(
        json.dumps('Failed to upgrade the authorization code.'), 401)
    response.headers['Content-Type'] = 'application/json'
    return response

  # An ID Token is a cryptographically-signed JSON object encoded in base 64.
  # Normally, it is critical that you validate an ID Token before you use it,
  # but since you are communicating directly with Google over an
  # intermediary-free HTTPS channel and using your Client Secret to
  # authenticate yourself to Google, you can be confident that the token you
  # receive really comes from Google and is valid. If your server passes the
  # ID Token to other components of your app, it is extremely important that
  # the other components validate the token before using it.
  gplus_id = credentials.id_token['sub']

  stored_credentials = session.get('credentials')
  stored_gplus_id = session.get('gplus_id')
  if stored_credentials is not None and gplus_id == stored_gplus_id:
    response = make_response(json.dumps('Current user is already connected.'),
                             200)
    response.headers['Content-Type'] = 'application/json'
    return response
  # Store the access token in the session for later use.
  session['credentials'] = credentials
  session['gplus_id'] = gplus_id
  response = make_response(json.dumps('Successfully connected user.', 200))
  response.headers['Content-Type'] = 'application/json'
  return response


@app.route('/disconnect', methods=['POST'])
def disconnect():
  """Revoke current user's token and reset their session."""

  # Only disconnect a connected user.
  credentials = session.get('credentials')
  if credentials is None:
    response = make_response(json.dumps('Current user not connected.'), 401)
    response.headers['Content-Type'] = 'application/json'
    return response

  # Execute HTTP GET request to revoke current token.
  access_token = credentials.access_token
  url = 'https://accounts.google.com/o/oauth2/revoke?token=%s' % access_token
  h = httplib2.Http()
  result = h.request(url, 'GET')[0]

  if result['status'] == '200':
    # Reset the user's session.
    del session['credentials']
    response = make_response(json.dumps('Successfully disconnected.'), 200)
    response.headers['Content-Type'] = 'application/json'
    return response
  else:
    # For whatever reason, the given token was invalid.
    response = make_response(
        json.dumps('Failed to revoke token for given user.', 400))
    response.headers['Content-Type'] = 'application/json'
    return response

def notLoggedIn():
    response = make_response(json.dumps('You must log in first.'), 401)
    response.headers['Content-Type'] = 'application/json'
    return response

if __name__ == '__main__':
    app.debug = True
    app.run(host = '0.0.0.0', port = 5000)