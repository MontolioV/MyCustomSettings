CALL nvm list

IF [%1]==[] ECHO Value Missing
IF [%1]==[14] CALL nvm use 14.17.4
IF [%1]==[16] CALL nvm use 16.13.1
