import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import joi from 'joi';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const mongoClient = new MongoClient(process.env.MONGO_URI);

const validateParticipant = joi.object({
    name : joi.string().required()
});

app.post('/participants', async (request, response)=>{
    const participant = request.body
    const validation = validateParticipant.validate(participant);
    if(validation.error){
        response.sendStatus(422);
    }

    try{
        await mongoClient.connect();
        const dbUol = mongoClient.db("chatUol");
        const participantsCollection = dbUol.collection("participants");
        const existParticipant = await participantsCollection.find({name: participant.name}).toArray();
        if(existParticipant.length === 0){
            participant.lastStatus = Date.now();
            await participantsCollection.insertOne(participant);
            response.send(participant).status(201);
            mongoClient.close();
            return;
        }else{
            response.sendStatus(409);
            mongoClient.close();
            return
        }
    }catch(error){
        response.sendStatus(500);
        mongoClient.close();
        return
    }
});

app.get('/participants', async (request, response)=>{
    try{
        await mongoClient.connect();
        const dbUol = mongoClient.db("chatUol");
        const participantsCollection = dbUol.collection("participants");
        const getParticipants = await participantsCollection.find().toArray();
        response.send(getParticipants).status(201);
        mongoClient.close();
        return
    }catch(error){
        response.sendStatus(500);
        mongoClient.close();
        return
    }
})

app.listen(5000, ()=>{
    console.log("Server ON")
});