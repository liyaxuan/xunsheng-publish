apiUrl =
	auth: 'http://api.xunsheng90.com/user/login'
	sign: 'http://sign.xunsheng90.com/oss-sign'
	upload: 'http://temp.xunsheng90.com'
	entity: 'http://api.xunsheng90.com/entity/uwork'

ajax = (args) ->
	xhr = new XMLHttpRequest()
	i = 0
	for key, value of args.paras
		args.url += ( if i==0 then '?' else '&' ) + key + '=' + value
		i++
	xhr.open args.method, args.url, args.isAsyn
	#如果args.form属性有值, 则构建FormData, 否则就是get请求
	if args.form isnt undefined
		formData=new FormData();
		for key, value of args.from
			formData.append key, value
	else
		xhr.send(null)

	if args.isAsyn
		xhr.onreadystatechange = () ->
			data = eval "(#{data.responseText})"
			if xhr.readyState is 4 and xhr.status is 200
				args.succ data
			else if xhr.readyState is 4 and xhr.status isnt 200
				args.fail data
	else
		return eval '(' + data.responseText + ')'

lyxInit = (uidToken, data) ->
	update = () ->
		return lyxAjax {
			isAsyn: true
			method: 'put'
			url: lyxApiUrl['auth']
			params: uidToken
			succ: (data) ->
				uidToken.token = data.token
			fail: () ->
		}

	sign = (isAsyn, succ, fail) -> 
		return lyxAjax {
			isAsyn: isAsyn
			method: 'get'
			url: apiUrl['sign']
			params: uidToken
			succ: succ
			fail: fail
		}

	initSimditor = () ->
		sign true, (data) ->
			delete data['status']
			editor = new Simditor {
				textarea: $ '#lyx-simditor' 
				toolbar: ['title', 'bold', 'italic', 'underline', 'strikethrough','color', '|', 'ol', 'ul', 'blockquote', '|', 'link', 'image', 'hr', '|', 'indent', 'outdent', 'alignment']
				toolbarFloat: true
				defaultImage: 'lib/simditor/images/image.png'
				upload:
				    url: apiUrl.upload
				    params: data
				    fileKey: 'file'
				    connectionCount: 3
				    leaveConfirm: '正在上传文件'
				pasteImage: false
				imageButton: ['upload']				
			}

			editor.on 'pasting', (e, $pasteContent) ->
				if $pasteContent.find('img').length > 0 
					alert '请使用图片上传功能, 而不要粘贴图片'
					return false;
				else
					return true;
			, (errorObject) -> 
				errorData = errorObject.data;
				if !errorData && errorData!=0 && typeof errorData != 'undefined' 
					alert '发生了不知道是什么的错误'
				else
					alert "发生了没有处理的错误\n错误代码: #{errorData.error_code}\n错误信息: #{errorData.error_info}\n错误描述: #{errorData.msg}"
				return
		return

	submitBody =
		title: ''
		thumbnail: ''
		class_name: ''
		author_uid: uidToken['uid']
		author_content: ''
		main_content: ''
		audio: ''
		audio_name: ''
		video: ''
		video_name: ''
		video_code: ''

	isUploadering = false

	setInterval update , 240*1000

	type = ['thumbnail', 'audio', 'video']
	choice =
		av: 'audio'
		fc: 'file'
	editor

	initSimditor()

	###
	进度框: 文件名, 进度条, 百分值, 停止按钮
	state:
		empty: 附件名和文件路径/代码都为空
		init: 文件路径/代码都为空为空, 附件名不做处理
		start: 进度框显示赋值文件名, 百分值和进度条赋值为0%
		going: 上传中, 更新百分值和进度条
		finished: 上传完成, 进度框隐藏, 附件显示
	args:
		switchTo: 切换到音频/视频
		filename: 文件名
		percent: 进度百分数
		filepath: 上传成功后返回的文件路径
	###

	Attachement = (type, process, element) ->
		this.uploader = this.initUploader type 
		this.process = process
		this.element = element
		return

	Attachement.prototype.changeState = (state, args) ->
		switch state
			when 'empty'
				isUploadering = false

				if args.switchTo is 'audio'
					submitBody['video'] = ''
					submitBody['video_name'] = ''
					submitBody['video_code'] = ''
				else if args.switchTo is 'video'
					submitBody['audio'] = ''
					submitBody['audio_name'] = ''

				this.process.hide();
				this.element.hide();
			when 'nofile'
				isUploadering = false

				if args.switchTo is 'audio'
					submitBody['video'] = ''
				else if args.switchTo is 'video'
					submitBody['audio'] = ''

				this.process.hide()
				this.element.hide()
			when 'start'
				isUploadering = true

				this.process.find('.filename').html args.filename 
				this.process.find('.percent').html '0%'
				this.process.find('.inner-bar').css 'width', '0%'

				this.process.show()
			when 'going'
				isUploadering = true

				this.process.find('.percent').html args.percent + '%'
				this.process.find('.inner-bar').css 'width', args.percent + '%'
			when 'finished'
				isUploadering = false

				this.process.hide()
				this.attachement.show()
		return

	Attachement.prototype.initUploader = (type) ->
		if type is 'audio'
			typeAllowed = 'mp3,wav,wma,ogg'
			maxSize = '15MB'
		else if type is 'video'
			typeAllowed = 'mp4,avi,wmv'
			maxSize = '350MB'
		else 
			typeAllowed = 'jpg,gif,png'
			maxSize = '5MB'

		_this = this

		option = 
			runtimes: 'html5,flash,silverlight,html4'
			browse_button: document.getElementById "lyx-#{type}-select" 
			container: document.getElementById "lyx-#{type}-container" 
		    url: 'http://temp.xunsheng90.com'
		    multi_selection: false
		    filters:
		    	mime_types: [{
		    		title: ''
		    		extensions: typeAllowed
		    	}]
		    	max_file_size: maxSize
		    	prevent_duplicates: false
		   	init:
		   		FilesAdded: (uploader, file) ->
		   			data = sign false
		   			data['success_action_status'] = '200'
		   			uploader.setOption {
			            url: apiUrl['file']
			            multipart_params: data		   				
		   			}
		   			uploader.start()

		   			_this.changeState 'start', {
		   				filename: file[0].name
		   			}
		   			return
		   		UploadProgress: (uploader, file) ->
		   			_this.changeState 'going', {
		   				percent: file.percent
		   			}
		   			return
		   		FileUploaded: (uploader, file, info) ->
		   			data = eval "(#{info.response})"

		   			_this.changeState 'finished', {
		   				filepath: data.file_path
		   			}
		   			return
		   		Error: (uploader, error) ->
		   			if error.code is '-600'
		   				alert '文件大小必须小于: ' + maxSize
		   			else if error.code is '-601'
		   				alert '文件格必须是: ' + typeAllowed
		   			return
		uploader = new plupload.Uploader option
		return uploader

	return

this.lyxInit=lyxInit

return