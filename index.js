import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import joi from 'joi';
import dayjs from 'dayjs';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const mongoClient = new MongoClient(process.env.MONGO_URI);

const validateParticipant = joi.object({
    name : joi.string().required()
});

const validateMsg = joi.object({
    from: joi.string().required(),
    to : joi.string().required(),
    text: joi.string().required(),
    type: joi.any().valid('message', 'private_message'),
    time: joi.string().required()
});

setInterval( async () => {
    await mongoClient.connect();
    const dbUol = mongoClient.db("chatUol");
    const participantsCollection = dbUol.collection("participants");
    const msgCollection = dbUol.collection ("messages");
    const deletedParticipants = await participantsCollection.find({lastStatus: {$lt : (Date.now()- 10000)}}).toArray();
    console.log(deletedParticipants);
    if (deletedParticipants.length > 0){
        for (const v of deletedParticipants){
            let auxObject = {
                from: v.name,
                to: 'Todos',
                text: 'sai da sala',
                type: 'status',
                time: dayjs().format('HH:mm:ss')
            };
            await msgCollection.insertOne(auxObject);
            await participantsCollection.deleteOne({name: v.name });
        };
    };
    console.log('entrei no set interval');
    mongoClient.close();
}, 15000);

app.post('/participants', async (request, response)=>{
    const participant = request.body
    const validation = validateParticipant.validate(participant);
    participant.lastStatus = Date.now();
    const intialMsg = {
        from: participant.name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: dayjs().format('HH:mm:ss')
    }
    if(validation.error){
        response.sendStatus(422);
        return;
    }

    try{
        await mongoClient.connect();
        const dbUol = mongoClient.db("chatUol");
        const participantsCollection = dbUol.collection("participants");
        const msgCollection = dbUol.collection ("messages");
        const existParticipant = await participantsCollection.find({name: participant.name}).toArray();
        if(existParticipant.length === 0 && participant.from !== null){
            await participantsCollection.insertOne(participant);
            await msgCollection.insertOne(intialMsg);
            response.send(participant).status(201);
            mongoClient.close();
            return;
        }else{
            response.sendStatus(409);
            mongoClient.close();
            return;
        }
    }catch(error){
        response.sendStatus(500);
        mongoClient.close();
        return;
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
        return;
    }catch(error){
        response.sendStatus(500);
        mongoClient.close();
        return;
    }
});

app.post('/messages', async (request, response)=>{
    const {to, text, type} = request.body;
    const name = request.headers.user;
    const message = {
        from: name,
        to: to,
        text: text,
        type: type,
        time: dayjs().format('HH:mm:ss')
    };
    const validation = validateMsg.validate(message);

    if(validation.error){
        console.log('erro');
        response.sendStatus(422);
        return;
    }

    try{
        await mongoClient.connect();
        const dbUol = mongoClient.db("chatUol");
        const msgCollection = dbUol.collection("messages");
        const participantsCollection = dbUol.collection("participants");
        const existParticipant = await participantsCollection.find({name: message.from}).toArray();
        if(existParticipant.length !== 0){
            await msgCollection.insertOne(message);
            response.send(message).status(200);
            mongoClient.close();
            return;
        }else{
            response.sendStatus(409);
            mongoClient.close();
            return;
        }
    }catch(error){
        response.sendStatus(500);
        mongoClient.close();
        return;
    }
    
});

app.get('/messages', async (request, response)=>{
    const user = request.headers.user;
    const limit = parseInt(request.query.limit);
    try{
        await mongoClient.connect();
        const dbUol = mongoClient.db("chatUol");
        const msgsCollection = dbUol.collection("messages");
        const getMsgs = await msgsCollection.find({$or:[{type: 'message'},{type:'status'},{type:'private_message', from: user },{type: 'private_message', to: user}]}).sort({_id: -1}).limit(limit).toArray();
        response.send(getMsgs).status(201);
        mongoClient.close();
        return;
    }catch(error){
        response.sendStatus(500);
        mongoClient.close();
        return;
    }
});

app.post('/status', async (request, response)=>{
    const user = request.headers.user;
    try{
        await mongoClient.connect();
        const dbUol = mongoClient.db("chatUol");
        const participantsCollection = dbUol.collection("participants");
        const existParticipant = await participantsCollection.find({name: user}).toArray();
        if(existParticipant.length !== 0){
            await participantsCollection.updateOne({name: user}, {$set:{lastStatus: Date.now()}})
            response.sendStatus(200);
            mongoClient.close();
            return;
        }else{
            response.sendStatus(404);
            mongoClient.close();
            return;
        }
    }catch(error){
        response.sendStatus(500);
        mongoClient.close();
        return;
    }
});



app.listen(5000, ()=>{
    console.log("Server ON")
});