@echo off
rem Run the study CLI from anywhere: study today, study quiz B1.2
rem %~dp0 is this file's own folder, so the repo can live wherever you like.
node "%~dp0tools\study.mjs" %*
