// "use strict";

const fs = require("fs");
const { Console } = require("console");
const { distance } = require("./utility");
const output = fs.createWriteStream('./stdout.log');
const errorOutput = fs.createWriteStream('./stderr.log');
var console = new Console({ stdout: output, stderr: errorOutput });

let inMemoryData = [];

const getData = () => new Promise((resolve, reject) => {
    fs.readFile("src/data.json", (err, data) => {
        if (err) {
            reject(err);
        } else {
            inMemoryData = JSON.parse(data);
            resolve(inMemoryData);
        }
    });
});


// lambda-like handler function
module.exports.handler = async (event, context) => {
    const objResponse = {
        errorCode: 200,
        data: []
    };

    try {
        // do stuff...
        const dbData = await getData();
        let {zipcode, cityName, latitude, longitude, type, state, county, country, timezone, populationGreaterThan} = event.queryStringParameters;

        if (zipcode) {
            objResponse.data = dbData.filter(objZipCode => objZipCode.zip.indexOf(zipcode) > -1);
        } else if (cityName) {
            cityName = cityName && cityName.toLowerCase().trim();
            objResponse.data = dbData.filter(objZipCode => objZipCode.primary_city.toLowerCase().indexOf(cityName) > -1);
        } else if (latitude || longitude) {

            // if one out of latitude or longitude is not there we assume that as 0
            latitude = latitude || 0;
            longitude = longitude || 0;

            // Get all cities distance from given lat and long
            const arrDistantCities = dbData.map(objZipCode => {
                objZipCode.distance = distance(objZipCode.latitude, objZipCode.longitude, latitude, longitude, "K");
                return objZipCode;
            });

            // Sort all cities by distance from given lat and long
            const arrSortedDistantCities = arrDistantCities.sort((a, b) => a.distance - b.distance);

            objResponse.data = arrSortedDistantCities[0];
        } else if (type || state || county || country || timezone || populationGreaterThan) {
            // filter by optional field type, state, county, country, timezone (atleast one require)

            type = type && type.toLowerCase().trim();
            state = state && state.toLowerCase().trim();
            county = county && county.toLowerCase().trim();
            country = country && country.toLowerCase().trim();
            timezone = timezone && timezone.toLowerCase().trim();

            objResponse.data = dbData.filter(objZipCode => {
                let isPassed = true;

                if (type) {
                    isPassed = objZipCode.type.toLowerCase().indexOf(type) > -1;
                }

                if (isPassed && state) {
                    isPassed = objZipCode.state.toLowerCase().indexOf(state) > -1;
                }

                if (isPassed && county) {
                    isPassed = objZipCode.county.toLowerCase().indexOf(county) > -1;
                }

                if (isPassed && country) {
                    isPassed = objZipCode.country.toLowerCase().indexOf(country) > -1;
                }

                if (isPassed && timezone) {
                    isPassed = objZipCode.timezone.toLowerCase().indexOf(timezone) > -1;
                }

                if (isPassed && populationGreaterThan) {
                    isPassed = Number(objZipCode.estimated_population) > populationGreaterThan;
                }

                return isPassed;
            });
        }

    } catch (error) {
        console.error("Error", error);
        objResponse.errorCode = 400;
        objResponse.errorMessage = error.stack || "Try again later";
    } finally {
        context.succeed(objResponse);
    }
};
