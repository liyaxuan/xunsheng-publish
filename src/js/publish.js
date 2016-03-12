/* 所有全局范围内的变量和函数都有姓名前缀 */

var lyxApiUrl={
	"auth": "http://api.xunsheng90.com/user/login",
	"sign": "http://sign.xunsheng90.com/oss-sign",
	"file": "http://temp.xunsheng90.com",
	"entity": "http://api.xunsheng90.com/entity/uwork",
};

/* 测试代码, 用来登录获取token */
// var data=lyxLogin({
// 	"uid": "admin001",
// 	"pwd": "kkmnb"
// });

/*
	lyxInit接受两个参数, 用于初始化整个发布面板
	data和uidToken
	data={
		method: 新建则值为"post", 编辑则值为为"put",
		id: 编辑的这篇作品的id, 如果是新建则没有该属性,
		succ: 提交成功触发的回调函数,
		fail: 提交失败触发的回调函数,
	}
	uidToken={ uid: "......", token: "......" }
*/
// lyxInit({
// 	"method": "post",
// 	succ: function () {
// 		alert("上传好了");
// 	},
// 	fail: function () {}
// 	}, {
// 	"uid": "admin001",
// 	"token": data.token
// });

function lyxLogin(uidPwd) {
	return lyxAjax({
		isAsy: false,
		method: "post",
		url: lyxApiUrl.auth,
		formJson: {
			uid: uidPwd.uid,
			pwd: hex_md5(uidPwd.uid+uidPwd.pwd),
		}
	});
}

function lyxAjax(o) {
	var xhr=new XMLHttpRequest();
	var i=0;
	for(var x in o.params) {
		o.url+=((i==0?"?":"&")+x+"="+o.params[x]);
		i++;
	}
	xhr.open(o.method, o.url, o.isAsy);

	if(o.formJson!==undefined) {
		var formData=new FormData();
		for(var x in o.formJson)
			formData.append(x, o.formJson[x]);
		xhr.send(formData);
	}
	else
		xhr.send(null);
	if(o.isAsy)
		xhr.onreadystatechange=function () {
			if(xhr.readyState==4&&xhr.status==200)
				o.succ(eval("("+xhr.responseText+")"));
			else if(xhr.readyState==4&&xhr.status!=200)
				o.fail(eval("("+xhr.responseText+")"));
		};
	else
		return eval("("+xhr.responseText+")");
}

function lyxInit(data, uidToken) {
	function sign(isAsy, succCallback, failCallback) {
		return lyxAjax({
			isAsy: isAsy,
			method: "get",
			url: lyxApiUrl["sign"],
			params: uidToken,
			succ: succCallback,
			fail: failCallback
		});
	}

	function update() {
		return lyxAjax({
			isAsy: true,
			method: "put",
			url: lyxApiUrl["auth"],
			params: uidToken,
			succ: function (data) {
				uidToken.token=data.token;
			},
			fail: function () {}
		})
	}

	function initSimditor() {
		sign(true, function () {
			delete data["status"];
			editor=new Simditor({
				textarea: $("#lyx-simditor"),
				toolbar: ["title", "bold", "italic", "underline", "strikethrough","color", "|", "ol", "ul", "blockquote", "|", "link", "image", "hr", "|", "indent", "outdent", "alignment"],
				toolbarFloat: true,
				defaultImage: "lib/simditor/images/image.png",
				upload: {
				    url: lyxApiUrl.file,
				    params: data,
				    fileKey: "file",
				    connectionCount: 3,
				    leaveConfirm: "正在上传文件"
				},
				pasteImage: false,
				imageButton: ["upload"]
			});

			editor.on("pasting", function (e, $pasteContent) {
				if($pasteContent.find("img").length>0) {
					alert("请使用图片上传功能, 而不要粘贴图片");
					return false;
				}
			});	
		}, function (errorObject) {
			var data=errorObject.data;
			if(!data&&data!=0&&typeof data!="undefined")
				alert("发生了不知道是什么的错误");
			else
				alert("发生了没有处理的错误\n错误代码: "+data.error_code+"\n错误信息: "+data.error_info+"\n错误描述: "+data.msg);
		});	
	}

	function initUploader(type) {
		var typeAllowed=[];
		var maxSize="";
		if(type=="audio") {
			typeAllowed="mp3,wav,wma,ogg";
			maxSize="15MB";
		}			
		else if(type=="video") {
			typeAllowed="mp4,avi,wmv";
			maxSize="350MB";
		}
		else {
			typeAllowed="jpg,gif,png";
			maxSize="5MB";
		}

		var uploader=new plupload.Uploader({
			runtimes: "html5,flash,silverlight,html4",
			browse_button: document.getElementById("lyx-"+type+"-select"),
			container: document.getElementById("lyx-"+type+"-container"),
		    url: "http://temp.xunsheng90.com",
		    multi_selection: false,
		    filters: {
		    	mime_types: [{
		    		title: "",
		    		extensions: typeAllowed
		    	}],
		    	max_file_size: maxSize,
		    	prevent_duplicates: false,
		    },
			init: {
				PostInit: function() {
					this.container=$("#lyx-"+type+"-container");
					this.process=this.container.find(".process");
					this.bar=this.container.find(".inner-bar");
					this.percentage=this.container.find(".percentage");
					this.attachment=this.container.find(".attachment");
				},
				FilesAdded: function(uploader, file) {
					var data=sign(false);
					data["success_action_status"]="200";

					uploader.setOption({
			            "url": lyxApiUrl["file"],
			            "multipart_params": data
			        });

			        uploader.start();

					this.process.find(".filename").html(file[0].name);
					this.bar.css("width", "0%");
					this.percentage.html("");
					this.attachment.hide();
				},
				UploadProgress: function(uploader, file) {
					isUploadering=true;				
					this.process.show();
					this.bar.css("width", file.percent+"%");
					this.percentage.html(file.percent+"%");
				},
				FileUploaded: function(uploader, file, info) {
					var data=eval("("+info.response+")");
					this.process.hide();

		            if(type=="thumbnail")
		            	this.attachment.find(".img").css("background-image", "url("+data["file_path"]+")");
		            else
		            	this.attachment.attr("src", data["file_path"]);
		            format[type]=data["file_path"];

		            this.attachment.css("display", "block");         	            
				},
				Error: function (uploader, error) {
					if(error.code=="-600")
						alert("文件大小必须小于: "+maxSize);
					else if(error.code=="-601")
						alert("文件格式必须是: "+typeAllowed);
				}
			}
		});

		uploader.init();
		return uploader;
	}

	function getDetail() {
		lyxAjax({
			isAsy: true,
			method: "get",
			url: lyxApiUrl["entity"]+"/"+data.id,
			params: uidToken,
			succ: function (data) {
				data=data.entity;
				$("#uwork-title").val(data.title);
				$("#lyx-thumbnail-attachment").show().find(".img").css("background-image", "url("+data.thumbnail+")");	

				if(data.media.media_type=="audio") {
					$("#lyx-audio-attachment").attr("src", data.media.url);
					$("#lyx-audio-attachment").css("display", "block");
					$("#uwork-audio-name").val(data.media.name);				
				}
				else {
					$("#lyx-video-attachment").attr("src", data.media.url);
					$("#lyx-video-attachment").css("display", "block");
					$("#uwork-video-name").val(data.media.name);
					$("#uwork-video-code").val(data.media.code);					
				}

				$("#uwork-main-content").html(data.main_content);		
			},
			fail: function () {}
		});
	}

	function imgCheck() {
		var result=true;
		$(".simditor-body").each(function () {
			$(this).find("img").each(function () {
				if($(this).attr("src").indexOf("http://")!=0) {
					alert("文本编辑器中有图片还在上传\n请等待片刻再点\"提交\"");
					result=false;
				}
			});
		});
		return result;
	}

	function check() {
		format["title"]=$("#uwork-title").val();
		format["main_content"]=editor.getValue();
		format["audio_name"]=$("#uwork-audio-name").val();
		format["video_name"]=$("#uwork-video-name").val();
		format["video_code"]=$("#uwork-video-code").val();

		$(".tip").hide();
		var result=true;

		if(format["title"]=="") {
			$(".title-tip").show();
			result=false;
		}
			
		if(format["thumbnail"]=="") {
			$(".thumbnail-tip").show();
			result=false;
		}

		if(format["main_content"]=="") {
			$(".main-content-tip").show();
			result=false;
		}

		if(choice.av=="audio") {
			if(format["audio"]=="") {
				$(".audio-file-tip").show();
				result=false;
			}
			if(format["audio_name"]=="") {
				$(".audio-name-tip").show();
				result=false;
			}
		}
		else {
			if(format["video_name"]=="") {
				$(".video-name-tip").show();
				result=false;
			}

			if(choice.fc=="file") {
				if(format["video"]==""&&data.method=="post") {
					$(".video-file-tip").show();
					result=false;
				}				
			}
			else {
				if(format["video_code"]=="") {
					$(".video-code-tip").show();
					result=false;
				}				
			}			
		}

		return result;
	}

	function publish() {
		lyxAjax({
			isAsy: true,
			method: data.method,
			url: (data.method=="post"?lyxApiUrl["entity"]:(lyxApiUrl["entity"]+"/"+data.id)),
			params: uidToken,
			succ: data.succ,
			fail: data.fail,
			formJson: format
		});
	}

	var format={
		"title": "",
		"thumbnail": "",
		"class_name": "",
		"author_uid": uidToken["uid"],
		"author_content": "",
		"main_content": "",
		"audio": "",
		"audio_name": "",
		"video": "",
		"video_name": "",
		"video_code": ""
	};

	setInterval(function () {
		update();
	}, 240*1000);

	if(data.method=="put")
		getDetail();

	var editor;
	initSimditor();
	var uploader=[];
	var type=["thumbnail", "audio", "video"];
	for(var i=0;i<type.length;i++)
		uploader[i]=initUploader(type[i]);
	var isUploadering=false;

	var choice={ "av": "audio", "fc": "file" };

	$(".lyx-cancel").bind("click", function () {
		var n=$(".lyx-cancel").index($(this));
		$(".process").index(n).hide();
		isUploadering=false;
		switch (n) {
			case 0:
				format["thumbnail"]="";
				break;
			case 1:
				format["audio"]="";
				break;
			case 2:
				format["video"]="";
				break;
		}
		uploader[n].stop();
	});

	$(".selection").bind("click", function () {
		$(".selection").removeClass("selected");
		$(this).addClass("selected");

		$(".av").hide();
		var id=$(this).attr("id");
		var type=id.slice(0, id.indexOf("-"));
		$("."+type).show();
		
		if($(this).attr("id")=="audio-selector") {
			format["video"]="";
			format["video_name"]=$("#uwork-video-name").val("");
			format["video_code"]=$("#uwork-video-code").val("");

			$(".sub-selection-group").hide();
			$("#lyx-video-attachment").hide();
			choice.av="audio";			
		}
		else {
			format["audio"]="";
			format["audio_name"]=$("#uwork-audio-name").val("");

			$(".sub-selection-group").show();
			$("#lyx-audio-attachment").hide();
			choice.av="video";	
		}
	});

	$(".sub-selection").bind("click", function () {

		$(".sub-selection").removeClass("selected");
		$(this).addClass("selected");

		if($(this).attr("id")=="video-file-selector") {
			format["video_code"]="";
			$(".video .file").show();
			$(".video .code").hide();
			choice.fc="file";
		}
		else if($(this).attr("id")=="video-code-selector") {
			format["video"]="";
			$(".video .code").show();
			$(".video .file").hide();
			$("#lyx-video-attachment").hide();
			choice.fc="code";
		}
	});

	$("#lyx-publish").bind("click", function () {
		if(imgCheck()) {
			if(!check()&&data.method=="post")
				alert("请将表单填写完整");
			else
				publish();
		}
	});
}