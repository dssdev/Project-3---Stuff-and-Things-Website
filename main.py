from flask import Flask, render_template, request, redirect, url_for, jsonify
app = Flask(__name__)

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from database_setup import Base, Stuff, Things

engine = create_engine('sqlite:///stuffnthings.db')
Base.metadata.bind = engine

DBSession = sessionmaker(bind=engine)
session = DBSession()

#In the event I need to tweak this query later
def getAllStuff():
    return session.query(Stuff).all()

def getAllStuffInventory():
    return session.query(Stuff.id, Stuff.name, func.count(Things.stuff_id)).outerjoin(Things).group_by(Stuff.name).all()

@app.route('/')
def stuff():
    stuff = getAllStuff()
    things = session.query(Things).limit(10)
    print(things)
    return render_template('main.html', stuff=stuff, things=things)

@app.route('/_get_stuff')
def getStuff():
    json = []
    for stuff in getAllStuffInventory():
        thingsList = []
        things = session.query(Things.name, Things.id).filter(Things.stuff_id==stuff[0]).all()
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
    newStuff = Stuff(name = request.form['name'])
    session.add(newStuff)
    session.commit()
    return 'Success'

@app.route('/updatething', methods=['POST'])
def updateThing():
    updateThing = session.query(Things).filter_by(id = request.form['id']).one()
    if request.form['name']:
        updateThing.name = request.form['name']
    if request.form['description']:
        updateThing.description = request.form['description']
    if request.form['quantity']:
        updateThing.quantity = request.form['quantity']
    if request.form['stuff_id']:
        updateThing.stuff_id = request.form['stuff_id']
    session.add(updateThing)
    session.commit()
    return 'Success'

@app.route('/getthing', methods=['GET'])
def getThing():
    id = request.args.get('id')
    print(id)
    thing = session.query(Things).filter(Things.id == id).all()

    return jsonify(Thing=[t.serialize for t in thing])

@app.route('/deletething', methods=['POST'])
def deleteThing():
    thingToDelete = session.query(Things).filter_by(id = request.form['id']).one()
    session.delete(thingToDelete)
    session.commit()
    return 'Success'

@app.route('/addthings', methods=['GET','POST'])
def addThings():
    if request.method == 'POST':
        newThing = Things(name = request.form['name'], description = request.form['description'], quantity = request.form['quantity'], stuff_id = request.form['stuff_id'])
        session.add(newThing)
        session.commit()
        return redirect(url_for('stuff'))
    else:
        stuff = getAllStuff()
        return render_template('addthings.html', stuff=stuff)


if __name__ == '__main__':
    app.debug = True
    app.run(host = '0.0.0.0', port = 5000)