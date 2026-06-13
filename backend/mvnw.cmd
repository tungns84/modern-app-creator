@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Apache Maven Wrapper startup batch script, version 3.3.2
@REM
@REM Required ENV vars:
@REM JAVA_HOME - location of a JDK home dir
@REM
@REM Optional ENV vars
@REM MAVEN_BATCH_ECHO - set to 'on' to enable the echoing of the batch commands
@REM MAVEN_BATCH_PAUSE - set to 'on' to pause the script before proceeding
@REM MAVEN_OPTS - set to parameters you want to pass to java e.g. -Xmx2048m
@REM MAVEN_SKIP_RC - flag to disable loading of mavenrc files
@REM ----------------------------------------------------------------------------

@IF "%MAVEN_BATCH_ECHO%" == "on"  echo %MAVEN_BATCH_ECHO%

@REM Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set MAVEN_CMD_LINE_ARGS=%*

@REM BEGIN WRAPPER CODE
@REM ===========================================================================================================

set MAVEN_PROJECTBASEDIR=%MAVEN_BASEDIR%
IF "%MAVEN_PROJECTBASEDIR%"=="" (
  set MAVEN_PROJECTBASEDIR=%~dp0
  :baseLoop
  IF EXIST "%MAVEN_PROJECTBASEDIR%pom.xml" GOTO baseDone
  set MAVEN_PROJECTBASEDIR_TEMP=%MAVEN_PROJECTBASEDIR%..
  FOR %%i IN ("%MAVEN_PROJECTBASEDIR_TEMP%") DO (
    set MAVEN_PROJECTBASEDIR=%%~fi
  )
  IF "%MAVEN_PROJECTBASEDIR%"=="%~dp0" GOTO baseDone
  goto baseLoop
  :baseDone
)

IF NOT EXIST "%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar" (
  %JAVA_HOME%\bin\java -e "^
      ... (downloading maven-wrapper.jar)"
)

@REM ===========================================================================================================
@REM END WRAPPER CODE

@REM Provide a "standardized" way to configure the JVM settings for this Maven Wrapper.
@REM Strings are not quoted and so multiple arguments should be separated by spaces.
@REM e.g.
@REM set JVM_CONFIG_MAVEN_PROPS=-Xmx512m -Xms256m -XX:MaxPermSize=128m
@REM %JVM_CONFIG_MAVEN_PROPS% are appended to MAVEN_OPTS at the end of this script.

set DOWNLOAD_URL="https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar"

%JAVA_HOME%\bin\java %MAVEN_OPTS% %JVM_CONFIG_MAVEN_PROPS% ^
  -classpath "%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar" ^
  "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" ^
  %WRAPPER_LAUNCHER% %MAVEN_CONFIG% %*

if ERRORLEVEL 1 goto error
goto end

:error
set ERROR_CODE=1

:end
@endlocal & set ERROR_CODE=%ERROR_CODE%

if not "%MAVEN_BATCH_PAUSE%"=="on" goto end2

echo Press enter to continue ...
pause

:end2
if "%MAVEN_BATCH_ECHO%"=="on" echo off

cmd /C exit /B %ERROR_CODE%
