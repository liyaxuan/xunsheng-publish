/* 所有全局范围内的变量和函数都有姓名前缀 */

var lyxApiUrl = {
	auth: "http://api.xunsheng90.com/user/login",
	sign: "http://sign.xunsheng90.com/oss-sign",
	file: "http://temp.xunsheng90.com",
	entity: "http://api.xunsheng90.com/entity/uwork",
};

/*
	lyxInit接受参数config用于初始化整个发布面板
	config = {
		offset: simditor的offset
		method: 新建则值为"post", 编辑则值为为"put",
		id: 编辑的这篇作品的id, 如果是新建则没有该属性,
		succ: 提交成功触发的回调函数,
		fail: 提交失败触发的回调函数,
		uid: "......",
		token: "......"
	}
*/

lyxInit({
	offset: 0,
	"method": "post",
	// "id": "5728c9c1d6c15500135cb543",
	succ: function () {
		alert("上传好了");
	},
	fail: function () {},
	"uid": "admin001",
	"token": lyxLogin({ uid: "admin001", pwd: "kkmnb" }).token
});

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

function lyxInit(config) {
	var format = {
		title: "",
		thumbnail: "",
		class_name: "",
		author_uid: config.uid,
		author_content: "",
		main_content: "",
		audio: "",
		audio_name: "",
		video: "",
		video_name: "",
		video_code: ""
	};

	var editor;

	initSimditor('#lyx-simditor', function () {
		if(config.method=="put")
			getDetail();
	});

	var uploader = ["thumbnail", "audio", "video"].map(function (item) {
		return initUploader(item);
	});
	var isUploading = false;
	var choice = { "av": "audio", "fc": "file" };

	setInterval(update, 240*1000);

	function errHanlder(err, tip) {
		if(!err && err != 0 && typeof err != "undefined")
			alert("发生了不知道是什么的错误");
		else
			alert(tip + "\n发生了没有处理的错误\n错误代码: " + err.error_code + "\n错误信息: " + err.error_info + "\n错误描述: " + err.msg);		
	}

	function sign(isAsy, succCallback, failCallback) {
		return lyxAjax({
			isAsy: isAsy,
			method: "get",
			url: lyxApiUrl["sign"],
			params: {
				uid: config.uid,
				token: config.token
			},
			succ: succCallback,
			fail: failCallback
		});
	}

	function update() {
		return lyxAjax({
			isAsy: true,
			method: "put",
			url: lyxApiUrl["auth"],
			params: {
				uid: config.uid,
				token: config.token
			},
			succ: function (response) {
				config.token = response.token;
			},
			fail: function (errObj) {
				var data = errObj.data;
				errHanlder('更新会话失败', data);
			}
		})
	}

	function initSimditor(selector, then) {
		sign(true, function (response) {
			delete response["status"];

			editor = new Simditor({
				textarea: $(selector),
				toolbar: ["title", "bold", "italic", "underline", "strikethrough","color", "|", "ol", "ul", "blockquote", "|", "link", "image", "hr", "|", "indent", "outdent", "alignment"],
				toolbarFloat: true,
				toolbarFloatOffset: config.offset,
				defaultImage: "lib/simditor/images/image.png",
				upload: {
				    url: lyxApiUrl.file,
				    params: response,
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

			then();
		}, function (errObj) {
			var data = errObj.data;
			errHanlder('获取签名失败, 不能初始化文本编辑器', data);
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
					isUploading = true;			
					this.process.show();
					this.bar.css("width", file.percent+"%");
					this.percentage.html(file.percent+"%");
				},
				FileUploaded: function(uploader, file, info) {
					isUploading = false;
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
						alert("文件大小必须小于: " + maxSize);
					else if(error.code=="-601")
						alert("文件格式必须是: " + typeAllowed);
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
			url: lyxApiUrl["entity"] + "/" + config.id,
			params: {
				uid: config.uid,
				token: config.token
			},
			succ: function (data) {
				data = data.entity;
				$("#lyx-title").val(data.title);
				$("#lyx-thumbnail-attachment").show().find(".img").css("background-image", "url("+data.thumbnail+")");	

				if(data.media.media_type=="audio") {
					$("#lyx-audio-attachment").attr("src", data.media.url);
					$("#lyx-audio-attachment").css("display", "block");
					$("#lyx-audio-name").val(data.media.name);				
				}
				else {
					$("#lyx-video-attachment").attr("src", data.media.url);
					$("#lyx-video-attachment").css("display", "block");
					$("#lyx-video-name").val(data.media.name);
					$("#lyx-video-code").val(data.media.code);					
				}

				editor.setValue(data.main_content);		
			},
			fail: function (errObj) {
				var data = errObj.data;
				errHanlder('获取文章内容失败', data);
			}
		});
	}

	function imgCheck() {
		var result=true;
		$(".simditor-body").each(function () {
			$(this).find("img").each(function () {
				if($(this).attr("src").indexOf("http://") != 0) {
					alert("文本编辑器中有图片还在上传\n请等待片刻再点\"提交\"");
					result = false;
				}
			});
		});
		return result;
	}

	function check() {
		format["title"]=$("#lyx-title").val();
		format["main_content"]=editor.getValue();
		format["audio_name"]=$("#lyx-audio-name").val();
		format["video_name"]=$("#lyx-video-name").val();
		format["video_code"]=$("#lyx-video-code").val();

		$(".tip").hide();
		var result = true;

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
				if(format["video"]==""&&config.method=="post") {
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
			method: config.method,
			url: (config.method == "post" ? lyxApiUrl["entity"] : (lyxApiUrl["entity"] + "/" + config.id)),
			params: {
				uid: config.uid,
				token: config.token
			},
			succ: function (response) {
				$(".lyx-layer").hide();
				config.succ(response);
			},
			fail: function (response) {
				$(".lyx-layer").hide();
				config.fail(response);
			},
			formJson: format
		});
	}

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
		if(isUploading) {
			alert('有文件正在上传中, 请稍后');
			return;
		}
		if(!imgCheck())
			return;
		if(!check() && config.method == "post")
			alert("请将表单填写完整");
		else {
			$(".lyx-layer").show();
			publish();
		}
	});
}