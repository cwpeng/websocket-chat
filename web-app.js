const fs=require("fs");
const crypto=require("crypto");
const parser=require("body-parser");
const express=require("express");
const app=express();
app.use(parser.urlencoded({extended:true}));
app.use(express.static("public"));
app.post("/signin", function(req, res){
	let username=req.body.username;
	if((username==="cwpeng1" && req.body.password==="123456") || (username==="cwpeng2" && req.body.password==="123456")){
		// save token to database
		let sha=crypto.createHash("sha256");
		sha.update(username+"hahaha"+(new Date()).getTime());
		let token=sha.digest("hex");
		let fd=fs.openSync("./sessions/"+username, "w");
		fs.writeSync(fd, token, encoding="utf-8");
		// send user data back
		res.cookie("username", username);
		res.cookie("token", token);
	}
	res.redirect("/");
});
app.listen(80, function(){
	console.log("Web Server Started");
});