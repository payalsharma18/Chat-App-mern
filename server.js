import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import Pusher from "pusher";
import cors from 'cors';

// app config
const app = express();
const port = process.env.PORT || 9000;

// Pusher configuration
const pusher = new Pusher({
    appId: "1813988",
    key: "304026cb33f9c0cfbbb2",
    secret: "27982c47d4006cf4a824",
    cluster: "ap2",
    useTLS: true
});

// middleware
app.use(express.json());
app.use(cors());

// DB config
const connectionUrl = 'mongodb+srv://payal:PayalSharma@cluster0.alecmgs.mongodb.net/ChatDB?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(connectionUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB connected successfully");
}).catch(err => {
    console.error("MongoDB connection error:", err);
});

const db = mongoose.connection;
db.once('open', () => {
    console.log("Connected to MongoDB database");

    const msgCollection = db.collection("messagecontent");
    const changeStream = msgCollection.watch();

    changeStream.on('change', (change) => {
        if (change.operationType === "insert") {
            const messageDetails = change.fullDocument;
            pusher.trigger('messages', "inserted", {
                name: messageDetails.name,
                message: messageDetails.message,
                timestamp: messageDetails.timestamp,
                received: messageDetails.received,
            });
        } else {
            console.log("error triggering pusher");
        }
    });
});

// API routes
app.get('/', (req, res) => res.status(200).send('Hello World'));

app.get('/messages/sync', async (req, res) => {
    console.log("Syncing new message:", Messages); // Log the incoming message

    try {
        const data = await Messages.find();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/messages/new', async (req, res) => {
    const dbMessage = req.body;
    console.log("Received new message:", dbMessage); // Log the incoming message
    try {
        const data = await Messages.create(dbMessage);
        console.log("Message saved:", data); // Log the saved message
        res.status(201).send(data);
    } catch (err) {
        console.error("Error saving message:", err); // Log the error
        res.status(500).send(err);
    }
});

// listening on port
app.listen(port, () => console.log('Listening on localhost', port));
