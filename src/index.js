var express = require('express')
var redis = require('redis');
var kue = require('kue');
var axios = require('axios');
var validUrl = require('valid-url');
var mongoose =require('mongoose')

var app = express()
app.set('port', (process.env.PORT || 5000));
var client = redis.createClient();
var queue = kue.createQueue();

client.on('connect', function() {
  console.log('connected to Redis');
});

client.on('error', function (err) {
  console.log("Error " + err);
});

queue.on( 'error', function( err ) {
  console.log( 'Kue Error: ', err );
});


//-----------Queue Function------------//

// function createJob(myUrl, res) {
//   var job = queue.create('request', myUrl).priority('high').removeOnComplete( true ).save( function(err) {
//     if( !err ) {
//       res.send("Your new id for the url is " + job.id);         // The key to the data is the provided link
//       client.hset(job.id, 'data', 'none', redis.print);        // creates a new hashed object {data.id : request}
//     }                                                         //  request is initally set to none
//     else{
//       res.send("There was an error importing your data");
//     }
//   });
// }

// function requestStatus(id, res) {
//   client.hget(id, 'data', function(err, obj) {
//     if (err){
//       res.send(err);
//     }
//     else if (obj == null){
//       res.send("This key does not exist! Check your spelling or try a new key");
//     }
//     else if (obj == 'none'){
//       res.send("This task is still running");
//     }
//     else{
//       res.send(obj);
//     }
//   });
// }

// function processRequest(job, done) { // Process that grabs the HTML and updates the Redis hash 
//   axios.get(job.data)
//     .then( function(response) {
//       client.hset(job.id, 'data', response.data, redis.print);
//       done();
//     });
// }

// queue.process('request', 5, function(job, done) { // the queue can process multiple jobs, currently set to 5
//   processRequest(job, done);
// });


// //---------------- Routes----------------//

// app.get('/', function (req, res) {
//   res.send('Massdrop Challenge: Create a request and view its status');
// })

// app.get('/status/:id', function (req, res) {
//   requestStatus(req.params['id'], res);
// })

// app.get('/create/:url', function (req, res) {
//   if (validUrl.isHttpUri("http://" + req.params['url'])) {
//     createJob("http://" + req.params['url'], res);
//   }
//   else{
//     res.send("Invalid URL. Please Input a valid URL");
//   }
// })

// app.listen(app.get('port'), function() {
//   console.log('Server listening on port: ', app.get('port'));
// });














// MongoDB configuration
mongoose.connect('mongodb+srv://Ankit56:0AdBv2SlzhxufMPj@cluster0.wxyttbt.mongodb.net/Ankit_Mittal-DB?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

const resultSchema = new mongoose.Schema({
  jobId: String,
  html: String,
});
const Result = mongoose.model('Result', resultSchema);

// Express configuration

app.use(express.json());

// Endpoint to create a job
app.post('/jobs', (req, res) => {
  const { url } = req.body;

  if (!validUrl.isUri(url)) {
    res.status(400).send({ error: 'Invalid URL' });
    return;
  }

  const job = queue.create('fetchHTML', { url }).save((err) => {
    if (err) {
      res.status(500).send({ error: 'Error creating job' });
      return;
    }

    redisClient.set(`job:${job.id}`, 'queued');
    res.send({ jobId: job.id });
  });
});

// Endpoint to check the status of a job
app.get('/jobs/:id/status', async (req, res) => {
  const { id } = req.params;
  const status = await redisClient.get(`job:${id}`);

  if (!status) {
    res.status(404).send({ error: 'Job not found' });
  } else {
    res.send({ status });
  }
});

// Endpoint to retrieve the HTML result of a job
app.get('/jobs/:id/result', async (req, res) => {
  const { id } = req.params;
  const status = await redisClient.get(`job:${id}`);

  if (!status) {
    res.status(404).send({ error: 'Job not found' });
    return;
  }

  if (status !== 'completed') {
    res.status(400).send({ error: 'Job not complete' });
    return;
  }

  const result = await Result.findOne({ jobId: id });

  if (!result) {
    res.status(404).send({ error: 'Result not found' });
  } else {
    res.send({ html: result.html });
  }
});

// Kue worker to fetch HTML content of a URL
queue.process('fetchHTML', async (job, done) => {
  const { url } = job.data;

  try {
    const response = await axios.get(url);
    const result = new Result({
      jobId: job.id,
      html: response.data,
    });
    await result.save();
    redisClient.set(`job:${job.id}`, 'completed');
    done();
  } catch (error) {
    console.error(`Error fetching HTML for job ${job.id}:`, error);
    redisClient.set(`job:${job.id}`, 'failed');
    done(error);
  }
});

// Start server
const port = 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));