const cron = require('node-cron');
const { Configuration, OpenAIApi } = require("openai");
const Twit = require('twit');
const request = require('request'); // Import the request module

// Environment Variables
const NYT_API_KEY = process.env.NYT_API_KEY;
const TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY;
const TWITTER_CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function getNytArticles() {
  const sections = ["arts", "books", "science", "technology", "travel"];
  const randomIndex = Math.floor(Math.random() * sections.length);
  const randomSection = sections[randomIndex];

  const NYT_MOST_VIEWED = `https://api.nytimes.com/svc/topstories/v2/${randomSection}.json?api-key=` + NYT_API_KEY;
  console.log('NTY URL: ', NYT_MOST_VIEWED);

  return new Promise((resolve, reject) => {
    request(NYT_MOST_VIEWED, function (error, response, body) {
      if (error) {
        console.error(error);
        reject(error);
      }

      const jsonResponse = JSON.parse(body);
      const results = jsonResponse.results.map(result => ({
        "title": result.title,
        "abstract": result.abstract
      }));

      const randomResults = [];
      const numResultsToSelect = 6;

      while (randomResults.length < numResultsToSelect) {
        const randomIndex = Math.floor(Math.random() * results.length);
        const randomResult = results[randomIndex];

        // Check if the random result has already been added
        if (!randomResults.includes(randomResult)) {
          randomResults.push(randomResult);
        }
      }

      resolve(randomResults);
    });
  });
}

function findSilverLining(Articles) {
  const { Configuration, OpenAIApi } = require("openai");

  const configuration = new Configuration({
    apiKey: OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  console.log('Articles: ', JSON.stringify(Articles));

  let Prompt = `Your a are ReaderGPT a Twitter account. Produce a one sentence positive insight using one of the following news articles and engage with your followers."
  ${JSON.stringify(Articles)}`


  return openai
    .createCompletion({
      model: "text-davinci-003",
      prompt: Prompt,
      temperature: 0.7,
      max_tokens: 64,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stop: ["\"\"\""],
    })
    .then((response) => {
      console.log("OpenAi Usage: ", response.data.usage);
      console.log("text:", response.data.choices[0].text);

      let silverLining = response.data.choices[0].text
      console.log(silverLining);

      return Promise.resolve(silverLining);
    })
    .catch((error) => {
      console.error(error);
      return Promise.reject(error);
    });
}

function postToTwitter(silverLining) {
  return new Promise((resolve, reject) => {
    console.log('Posting to Twitter: ', silverLining)

    // Require the twit package
    const Twit = require('twit');

    // Set up the configuration object with your API keys and access tokens
    const config = {
      consumer_key: TWITTER_CONSUMER_KEY,
      consumer_secret: TWITTER_CONSUMER_SECRET,
      access_token: TWITTER_ACCESS_TOKEN,
      access_token_secret: TWITTER_ACCESS_TOKEN_SECRET,
    };

    // Create a new instance of the twit object with OAuth 1.0a authentication
    const T = new Twit(config);

    // Use the post method to tweet a message
    T.post('statuses/update', { status: silverLining }, function (err, data, response) {
      if (err) {
        console.log(err);
      } else {
        console.log('Tweet posted successfully.');
      }
    });
  });
}

function main() {
  getNytArticles()
    .then(results => findSilverLining(results)
      .then(silverLining => postToTwitter(silverLining)
        .catch(error => {
          console.error(error);
        })));
}

main();
// run main every 5 minutes
cron.schedule('*/5 * * * *', main)