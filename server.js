const express = require('express');
const superAgent = require('superagent');
const pg = require('pg');
const cors = require('cors');
const methodOverride = require('method-override');

require('dotenv').config();
const app = express();
app.use(cors());
app.use(methodOverride('_method'));
app.set('view engine','ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));
// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); 

app.get('/', handleHomePage)

app.get('/getCountryResult', handleGetCountry)

app.get('/allCountries', handleAllCountries)

app.get('/myRecords', handleMyRecords)

app.post('/myRecords', handleAddingRecord)

app.get('/myRecords/:id', handleRecordDetails)

app.delete('/myRecords/:id', handleDelete)

client.connect().then(() =>{
    app.listen(process.env.PORT, function(){
        console.log('Listening on port ' + process.env.PORT)
    })
})

function Country(country){
    this.name = country["Country"];
    this.countryCode = country["CountryCode"]
    this.totalConfirmed = country["TotalConfirmed"];
    this.totalDeaths = country["TotalDeaths"];
    this.totalRecovered = country["TotalRecovered"];
    this.date = country["Date"]
}

function handleHomePage(req, res){
    getTotalData().then(data => res.render('index', {total : data})).catch(error => console.log('error'))
}
function handleGetCountry(req, res){
    req.query.country = req.query.country.split(" ").length >= 2 ? req.query.country.split(" ").join("-") : req.query.country;
    req.query.from += 'T00:00:00Z'
    req.query.to += 'T00:00:00Z'
    console.log(req.query)
    let url = `https://api.covid19api.com/country/${req.query.country}/status/confirmed`;
    const query = {
        from: req.query.from,
        to: req.query.to
    }
    superAgent.get(url).query(query).then(data =>{
        res.render('pages/getCountryResult', {data: data.body})
    }).catch(error => console.log('this error'))
}
function handleAllCountries(req,res){
    getAllCountriesData().then(data => res.render('pages/allCountries', {allCountries: data})).catch(error => console.log('error'))
}

function handleMyRecords(req, res){
    let searchQuery = 'SELECT * FROM records;'
    client.query(searchQuery).then(records =>{
        res.render('pages/myRecords', {records: records.rows})
    })
}

function handleAddingRecord(req, res){
    let country = JSON.parse(req.body.countryData);
    let addQuery = 'INSERT INTO records(country, totalConfirmed, totalDeaths, totalRecovered,  date) VALUES($1, $2, $3, $4, $5);'
    const safeValues = [country.name, country.totalConfirmed, country.totalDeaths, country.totalRecovered, country.date];
    client.query(addQuery, safeValues).then(() =>{
        console.log("Data has been added to the database")
        res.redirect('/myRecords')
    }).catch(error => console.log('error'))
}

function handleRecordDetails(req, res){
    let selectQuery = 'SELECT * FROM records WHERE id = $1';
    client.query(selectQuery, [req.params.id]).then(details =>{
        res.render('pages/recordDetails', {record: details.rows[0]})
    }).catch(error => console.log('error'))
}

function handleDelete(req, res){
    let deleteQuery = 'DELETE FROM records WHERE id = $1'
    client.query(deleteQuery, [req.params.id]).then(() =>{
        console.log("Data has been deleted")
        res.redirect('/myRecords')
    })
}

function getTotalData(){
    let url = 'https://api.covid19api.com/world/total'
    return superAgent.get(url).then(data =>{
        return data.body
    })
}

function getAllCountriesData(){
    let url = 'https://api.covid19api.com/summary'
    return superAgent(url).then(data =>{
        return data.body["Countries"].map(country => new Country(country))
    })
}