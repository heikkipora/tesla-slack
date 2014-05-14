#!/bin/bash
npm install
npm prune
foreman start -f Procfile_dev
