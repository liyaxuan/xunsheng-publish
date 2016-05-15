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

function lyxLoad(root, config) {
	var xhr = new XMLHttpRequest();
	xhr.onload = function () {
		root.innerHTML = xhr.responseText;

		['lib/simditor/styles/simditor.css', 'src/css/publish.css'].forEach(function (item) {
			var link = document.createElement('link');
			link.setAttribute('rel', 'stylesheet');
			link.setAttribute('href', item);
			document.querySelector('head').appendChild(link);
		});

		var scripts = ['lib/jquery/jquery.min.js', 'lib/simditor/scripts/module.js',
		'lib/simditor/scripts/uploader.js', 'lib/simditor/scripts/hotkeys.js',
		'lib/simditor/scripts/simditor.js', 'lib/plupload/plupload.full.min.js',
		'lib/md5/md5.js', 'src/js/main.js'];

		function loadScripts(scripts) {
			if(scripts.length > 0) {
				var src = scripts.shift();
				var script = document.createElement('script');
				script.setAttribute('src', src);		
				script.onload = function () {
					console.log(src);
					if(scripts.length == 0) {
						var c = config || {
							offset: 0,
							method: "post",
							succ: function () {
								alert("上传好了");
							},
							fail: function () {},
							uid: "admin001",
							token: lyxLogin({ uid: "admin001", pwd: "kkmnb" }).token
						};
						
						lyxInit(c);						
					}

					loadScripts(scripts);
				};
				document.querySelector('body').appendChild(script);
			}
		}

		loadScripts(scripts);
	};
	xhr.open('get', 'publish.html');
	xhr.send();
}

lyxLoad(document.querySelector('body'));