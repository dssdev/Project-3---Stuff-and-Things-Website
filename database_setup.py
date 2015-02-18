import os
import sys
from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy import create_engine

Base = declarative_base()

class Stuff(Base):
    __tablename__ = 'stuff'

    #SQLite treats an integer type that's a primary key as a ROWID and will auto gen when left blank.
    #So this is intended to be treated as an autonumber
    id = Column(Integer, primary_key=True)
    name = Column(String(250), nullable=False)

    @property
    def serialize(self):
       return {
           'id'         : self.id,
           'name': self.name
       }


class Things(Base):
    __tablename__ = 'things'

    #SQLite treats an integer type that's a primary key as a ROWID and will auto gen when left blank.
    #So this is intended to be treated as an autonumber
    id = Column(Integer, primary_key=True)
    name = Column(String(250), nullable=False)
    description = Column(String(250))
    quantity = Column(Integer)
    stuff_id = Column(Integer,ForeignKey('stuff.id'))
    stuff = relationship(Stuff)

    @property
    def serialize(self):
       return {
           'id'         : self.id,
           'name': self.name,
           'description' : self.description,
           'quantity' : self.quantity,
           'stuff_id' : self.stuff_id
       }

engine = create_engine('sqlite:///stuffnthings.db')


Base.metadata.create_all(engine)