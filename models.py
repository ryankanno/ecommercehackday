from sqlalchemy import Column, Integer, Unicode, String, Boolean, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship 
from database import Base


class Feast(Base):
    __tablename__ = 'Feast'

    id = Column(Integer, primary_key=True)
    guid = Column(String)
    feast_date = Column(DateTime)
    restaurant_id = Column(BigInteger) 
    street = Column(String)
    city = Column(String)
    zipcode = Column(String)

    participants = relationship('FeastParticipant', backref='feast',
        primaryjoin="Feast.id==FeastParticipant.feast_id")

    def __init__(self, guid=None, feast_date=None, restaurant_id=None,
            street=None, city=None, zipcode=None): 
        self.guid = guid
        self.feast_date = feast_date
        self.restaurant_id = restaurant_id
        self.street = street
        self.city = city 
        self.zipcode = zipcode
    

class FeastParticipant(Base):
    __tablename__ = 'FeastParticipant'

    id = Column(Integer, primary_key=True)
    email = Column(String)
    hash = Column(String)
    feast_id = Column(BigInteger, ForeignKey('Feast.id'))
    is_creator = Column(Boolean)

    orders = relationship('FeastParticipantOrder', backref='participant',
        primaryjoin="FeastParticipant.id==FeastParticipantOrder.participant_id")

    def __init__(self, email=None, hash=None, is_creator=False): 
        self.email = email
        self.hash = hash 
        self.is_creator = is_creator


class FeastParticipantOrder(Base):
    __tablename__ = 'FeastParticipantOrder'

    id = Column(Integer, primary_key=True)
    participant_id = Column(BigInteger, ForeignKey('FeastParticipant.id'))
    tray_string = Column(String)
    tray_total = Column(String)
    
    def __init__(self, participant_id=None, tray_string=None, tray_total=None):
        self.participant_id = participant_id
        self.tray_string = tray_string
        self.tray_total = tray_total
