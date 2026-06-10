$env:JAVA_HOME = "$PSScriptRoot\jdk-21\jdk-21.0.3+9"
$env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH
mvn clean spring-boot:run
