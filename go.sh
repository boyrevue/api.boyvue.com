#!/bin/bash

#tsconfig.build.json
#{
#  "extends": "./tsconfig.json",
#  "compilerOptions": {
##    "outDir": "./dist",      // Output directory for compiled JS files
#    "rootDir": "./src"       // Input directory for TypeScript files
#  },
#  "exclude": [
#    "node_modules",
#    "test",
#    "dist",
#    "**/*spec.ts"
#  ],
#  "include": [
#    "src/**/*.ts"
#  ]
#}


#nvm install 20.11.1
#rm package-lock.json
#rm -rf dist
#rm -rf node_modules 
#yarn install
#yarn tsc
#yarn build
#npx tsc -p tsconfig.build.json

# Install sharp and next if necessary
#yarn add next
#yarn add @types/moment --dev
#yarn add sharp --ignore-engines

# Build the application
#yarn build

# Start the app in production mode with pm2
PORT=8080 pm2 start "yarn start:prod" --name xfans-api 

# View pm2 logs
pm2 logs
