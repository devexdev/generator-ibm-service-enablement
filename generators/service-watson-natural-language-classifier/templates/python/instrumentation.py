from ibmcloudenv import IBMCloudEnv
from watson_developer_cloud import NaturalLanguageClassifierV1


if IBMCloudEnv.getString('watson_natural_language_classifier_apikey'):
    iam_url = 'https://iam.stage1.bluemix.net/identity/token' if 'gateway-s.' in params.url else 'https://iam.bluemix.net/identity/token'
    iam_apikey = api_key=IBMCloudEnv.getString('watson_natural_language_classifier_apikey')
    visual_recognition = VisualRecognitionV3(
        iam_url,
        iam_apikey)
else:
    natural_language_classifier = NaturalLanguageClassifierV1(
        username=IBMCloudEnv.getString('watson_natural_language_classifier_username'),
        password=IBMCloudEnv.getString('watson_natural_language_classifier_password'))
<% if (bluemix.backendPlatform.toLowerCase() === 'python') { %>
def getService(app):
    return 'watson-natural-language-classifier', natural_language_classifier
<% } else { %>
def getService():
    return 'watson-natural-language-classifier', natural_language_classifier
<% } %>
