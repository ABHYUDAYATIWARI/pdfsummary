import dotenv from 'dotenv';
import {connectDB} from "./src/config/db.js";
import app from './app.js'

dotenv.config({path:'./.env'})

app.get('/health-check', (req, res) => {
    res.send('Server is running healthy 👍');
});


connectDB()
.then(
    app.listen(process.env.PORT || 3000, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    })

)
.catch((err)=>{
    console.log("MONGO db connection failed !!! ", err);

})