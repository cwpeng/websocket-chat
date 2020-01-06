const fs=require("fs");
const WebSocket=require("ws");
const server=new WebSocket.Server({port:8080});
let authorize=function(auth){
	if(auth==="service-secret"){
		return true;
	}
	let sessionPath="./sessions/"+auth.username;
	if(fs.existsSync(sessionPath)){
		let token=fs.readFileSync(sessionPath, {encoding:"utf-8"});
		return token===auth.token;
	}else{
		return false;
	}
};
let usersData={};
let usersWS={};
let serviceData={serving:null};
let serviceWS=null;
server.on("connection", function(ws){
	ws.isAlive=true;
	ws.on("message", function(data){
		data=JSON.parse(data);
		if(!authorize(data.auth)){
			usersData[data.auth.username]=null;
			delete usersData[data.auth.username];
			if(usersWS[data.auth.username]){
				try{
					usersWS[data.auth.username].close();
				}catch(e){}
			}
			delete usersWS[data.auth.username];
			ws.send(JSON.stringify({
				action:"server-reject"
			}));
		}
		let userData;
		let message;
		switch(data.action){
			case "client-init":
				userData=usersData[data.auth.username];
				if(!userData){
					userData={
						username:data.auth.username,
						messages:[],
						auto:true,
						update_time:(new Date()).getTime()
					};
					usersData[data.auth.username]=userData;
				}
				usersWS[data.auth.username]=ws;
				ws.send(JSON.stringify({
					action:"server-init",
					payload:userData
				}));
				break;
			case "client-message":
				message=data.payload.message;
				userData=usersData[data.auth.username];
				userData.messages.push("<b>"+userData.username+":</b> "+message);
				if(userData.auto){
					userData.messages.push("<b>機器人:</b> 這是自動回應");
				}
				userData.update_time=(new Date()).getTime();
				ws.send(JSON.stringify({
					action:"server-message",
					payload:userData
				}));
				if(serviceData.serving===userData.username && serviceWS!==null && serviceWS.isAlive){
					serviceWS.send(JSON.stringify({
						action:"server-service-message",
						payload:userData
					}));
				}
				break;
			case "service-init":
				serviceWS=ws;
				ws.send(JSON.stringify({
					action:"server-service-init",
					payload:usersData
				}));
				break;
			case "service-enter":
				if(serviceData.serving!==null){
					usersData[serviceData.serving].auto=true;
				}
				serviceData.serving=data.payload.username;
				usersData[serviceData.serving].auto=false;
				ws.send(JSON.stringify({
					action:"server-service-enter",
					payload:usersData[data.payload.username]
				}));
				break;
			case "service-message":
				let username=serviceData.serving;
				userData=usersData[username];
				message=data.payload.message;
				userData.messages.push("<b>服務人員:</b> "+message);
				userData.update_time=(new Date()).getTime();
				ws.send(JSON.stringify({
					action:"server-service-message",
					payload:userData
				}));
				if(usersWS[username] && usersWS[username].isAlive){
					usersWS[username].send(JSON.stringify({
						action:"server-message",
						payload:userData
					}));
				}
				break;
		}
	});
	ws.on("close", function(data){
		ws.isAlive=false;
		console.log("closed", data);
	});
});