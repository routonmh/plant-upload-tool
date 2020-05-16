const axios = require("axios");
const fs = require("fs");
const path = require("path");
const xlsx = require('xlsx');

const DATA_DIR = './plant-data';
const DIRECTORIES = [path.join(DATA_DIR, 'jim')]
const RECORD_OFFSET = 1000;
const PLANT_FILENAME = 'Plant.xlsx';
const ATTRIBUTE_FILENAME = 'Attribute.xlsx';
const REGION_SHAPE_FILENAME = 'RegionShapeFile.xlsx';
const API_HOST = 'http://localhost:5000';
const REQUEST_MS_DELAY = 50;

const apiKey = require('./config').apiKey;

const axiosAuthenticated = axios.create({
    baseURL: API_HOST,
    headers: {
        "Authorization": apiKey
    }
});

function readDataFile(fp) {
    let wb = xlsx.readFile(fp);
    let sheetNames = wb.SheetNames;
    return xlsx.utils.sheet_to_json(wb.Sheets[sheetNames[0]])
}

function createOffsetRecords(dataDir, idx) {

    let offsetRecords = {
        plants: [],
        attributes: [],
        regionShapeFiles: [],
        images: []
    }

    let plantFilepath = path.join(dataDir, PLANT_FILENAME);
    let attributeFilepath = path.join(dataDir, ATTRIBUTE_FILENAME);
    let regionShapeFilepath = path.join(dataDir, REGION_SHAPE_FILENAME);

    let plants = readDataFile(plantFilepath);
    let attributes = readDataFile(attributeFilepath);
    let regionShapeFiles = readDataFile(regionShapeFilepath);

    let offset = RECORD_OFFSET * idx;

    plants.map(it => offsetRecords.plants.push({
        PlantID: it.PlantID + offset,
        CommonName: it.CommonName,
        ScientificName: it.ScientificName,
        PlantDescription: it.Description,
        IsEdible: it.IsEdible
    }));

    attributes.map(it => offsetRecords.attributes.push({
        PlantID: it.PlantID + offset,
        AttributeDescription: it.Description
    }));

    regionShapeFiles.map(it => offsetRecords.regionShapeFiles.push({
        PlantID: it.PlantID + offset,
        LinkToFile: it.LinkToFile
    }));

    return offsetRecords;
}

function sleep(ms) {
    return new Promise((resolve, reject) => setTimeout(() => resolve(), ms));
}

async function uploadRecords(offsetRecordSets) {

    for (let rsIdx = 0; rsIdx < offsetRecordSets.length; rsIdx++) {

        let recordSet = offsetRecordSets[rsIdx];
        for (let idx = 0; idx < recordSet.plants.length; idx++) {
            console.log("Submitting plant . . .");

            let plant = recordSet.plants[idx];
            try {
                await axios.post(`${API_HOST}/api/plant/add-plant`, plant);
            }
            catch (ex) {
                console.log("Failed to submit: ");
                console.log(plant);
            }
            await sleep(REQUEST_MS_DELAY);
        }
        for (let idx = 0; idx < recordSet.attributes.length; idx++) {
            console.log("Submitting attribute . . .");

            let attr = recordSet.attributes[idx];
            try {
                await axios.post(`${API_HOST}/api/plant/add-attribute`, attr);
            }
            catch (ex) {
                console.log("Failed to submit:")
                console.log(attr);
            }
            await sleep(REQUEST_MS_DELAY);
        }
        for (let idx = 0; idx < recordSet.regionShapeFiles.length; idx++) {
            console.log("Submitting shape file . . .")

            let shapeFile = recordSet.regionShapeFiles[idx];
            try {
                await axios.post(`${API_HOST}/api/plant/add-region-shape-file`, shapeFile);
            }
            catch (ex) {
                console.log("Failed to submit: ")
                console.log("")
            }
            await sleep(REQUEST_MS_DELAY);
        }
    }
}

let offsetRecordSets = DIRECTORIES.map((it, idx) => createOffsetRecords(it, idx));
uploadRecords(offsetRecordSets)

