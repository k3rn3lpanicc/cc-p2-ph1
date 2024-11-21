const { default: axios } = require('axios');
const { configDotenv } = require('dotenv');
const express = require('express');
const app = express();
configDotenv();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.use(express.json());

app.get('/word', (req, res) => {
	const result = axios.get('https://api.api-ninjas.com/v1/randomword', {
		headers: {
			'X-Api-Key': API_KEY,
		},
	});

	result.then((response) => {
		res.json(response.data.word[0]);
	});
});

app.get('/definition', (req, res) => {
	const word = req.query.word;
	const result = axios.get(
		`https://api.api-ninjas.com/v1/dictionary?word=${word}`,
		{
			headers: {
				'X-Api-Key': API_KEY,
			},
		}
	);

	result.then((response) => {
		res.json(response.data.definition);
	});
});
console.log({ PORT, API_KEY });
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
