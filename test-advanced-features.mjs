#!/usr/bin/env node

/**
 * Script de test pour les fonctionnalités avancées du chatbot
 * Teste: génération d'images, upload de fichiers, génération de musique
 */

import { spawn } from 'child_process';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000/api/trpc';

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function curlRequest(endpoint, data) {
  return new Promise((resolve) => {
    const curl = spawn('curl', [
      '-s',
      '-X', 'POST',
      `${BASE_URL}/${endpoint}`,
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify(data),
    ]);

    let output = '';
    curl.stdout.on('data', (data) => {
      output += data.toString();
    });

    curl.on('close', () => {
      try {
        resolve(JSON.parse(output));
      } catch (e) {
        resolve({ error: { message: 'Invalid JSON response' } });
      }
    });
  });
}

async function testGenerateImage() {
  log('\n📸 TEST: Génération d\'Images', 'blue');
  
  try {
    const response = await curlRequest('chat.generateImage', {
      json: {
        prompt: 'Un coucher de soleil magnifique sur l\'océan avec des palmiers',
      },
    });

    if (response.result?.data?.url) {
      log('✅ Génération d\'image réussie', 'green');
      log(`URL de l'image: ${response.result.data.url}`, 'green');
      return true;
    } else if (response.error) {
      log(`⚠️ Erreur: ${response.error.message}`, 'yellow');
      return false;
    } else {
      log('⚠️ Réponse inattendue', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'red');
    return false;
  }
}

async function testUploadFile() {
  log('\n📁 TEST: Upload de Fichiers', 'blue');
  
  try {
    // Créer un fichier de test
    const testFilePath = '/tmp/test_file.txt';
    fs.writeFileSync(testFilePath, 'Ceci est un fichier de test pour le chatbot Le Koussay IA');
    
    // Lire le fichier
    const fileBuffer = fs.readFileSync(testFilePath);
    const base64Content = fileBuffer.toString('base64');
    
    const response = await curlRequest('chat.uploadFile', {
      json: {
        fileName: 'test_file.txt',
        fileContent: base64Content,
        fileType: 'text/plain',
      },
    });

    if (response.result?.data?.url) {
      log('✅ Upload de fichier réussi', 'green');
      log(`URL du fichier: ${response.result.data.url}`, 'green');
      return true;
    } else if (response.error) {
      log(`⚠️ Erreur: ${response.error.message}`, 'yellow');
      return false;
    } else {
      log('⚠️ Réponse inattendue', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'red');
    return false;
  }
}

async function testGenerateMusic() {
  log('\n🎵 TEST: Génération de Musique', 'blue');
  
  try {
    const response = await curlRequest('chat.generateMusic', {
      json: {
        prompt: 'Une musique relaxante et apaisante avec des sons de nature',
      },
    });

    if (response.result?.data?.message) {
      log('✅ Génération de musique réussie', 'green');
      log(`Message: ${response.result.data.message}`, 'green');
      return true;
    } else if (response.error) {
      log(`⚠️ Erreur: ${response.error.message}`, 'yellow');
      return false;
    } else {
      log('⚠️ Réponse inattendue', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'red');
    return false;
  }
}

async function testSendMessage() {
  log('\n💬 TEST: Envoi de Message', 'blue');
  
  try {
    const response = await curlRequest('chat.sendMessage', {
      json: {
        message: 'Bonjour! Comment ça va?',
      },
    });

    if (response.result?.data?.response) {
      log('✅ Message envoyé avec succès', 'green');
      log(`Réponse: ${response.result.data.response.substring(0, 100)}...`, 'green');
      return true;
    } else if (response.error) {
      log(`⚠️ Erreur: ${response.error.message}`, 'yellow');
      return false;
    } else {
      log('⚠️ Réponse inattendue', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('\n🧪 DÉBUT DES TESTS DES FONCTIONNALITÉS AVANCÉES', 'yellow');
  log('================================================\n', 'yellow');
  
  const results = {
    'Génération d\'images': await testGenerateImage(),
    'Upload de fichiers': await testUploadFile(),
    'Génération de musique': await testGenerateMusic(),
    'Envoi de messages': await testSendMessage(),
  };
  
  log('\n================================================', 'yellow');
  log('📊 RÉSUMÉ DES TESTS', 'yellow');
  log('================================================\n', 'yellow');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([feature, result]) => {
    const status = result ? '✅ PASSÉ' : '⚠️ ÉCHOUÉ';
    log(`${feature}: ${status}`, result ? 'green' : 'yellow');
  });
  
  log(`\nTotal: ${passed}/${total} tests réussis\n`, passed === total ? 'green' : 'yellow');
}

runTests();
