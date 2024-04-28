const express = require('express')
const app = express();
const fs = require('fs').promises;
const path = require('path');

const mspOrg = 'PemilihanMSP';
const walletPath = path.join(__dirname, 'wallet');
const idOrg = 'Pemilihan';

const registerUser = require('./app/registerUser');

//start registering wallet all users in once -> hanya dijalankan di awal (tidak termasuk dalam batasan penelitian)
app.post('/registerUser', async(res) => {
    try {
        const data = await fs.readFile('./mahasiswa.csv');
        const csv = await import('neat-csv');
        const parsedData = await csv.default(data);
        const values = parsedData
                    .filter(row => row['email']) //filter row yang kosong
                    .map(row => row['email']); //mapping tiap row nanti hasil dari values adalah ['email','email',...]
        const response = await registerUser.registerManyUsers(values, idOrg, mspOrg, walletPath);
        res.send(response);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
})
//end registering wallet all users in once

app.listen(3000, () => {
    console.log("Server successfully running on port 3000");
});