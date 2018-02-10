'use strict';

var controller_name = "cryptonomica.controller.ethereumVerification";

// add to: 
// index.html +
// controller.js +
// router.js + ( url: '/ethereumVerification/{fingerprint}')

var controller = angular.module(controller_name, []);

// https://docs.angularjs.org/api/ng/provider/$logProvider
controller.config(function ($logProvider) {
        // $logProvider.debugEnabled(false);
        $logProvider.debugEnabled(true);
    }
);

controller.controller(controller_name, [
    '$scope',
    '$sce',
    '$rootScope',
    '$http',
    'GApi',
    'GAuth',
    'GData',
    '$state',
    // 'uiUploader',
    '$log',
    '$cookies',
    '$timeout',
    '$window',
    '$stateParams',
    function ethVerificationCtrl($scope,    // <- name for debugging
                                 $sce,
                                 $rootScope,
                                 $http,
                                 GApi,
                                 GAuth,
                                 GData,
                                 $state,
                                 // uiUploader,
                                 $log,
                                 $cookies,
                                 $timeout,
                                 $window,
                                 $stateParams) {

        /*
        * in the view add id with controller name to parent div:
        * <div id="ethVerificationCtrl">
        * use this id to access $scope in browser console:
        * angular.element(document.getElementById('ethVerificationCtrl')).scope();
        * for example: for example: $scope = angular.element(document.getElementById('ethVerificationCtrl')).scope();
        * */

        $log.info("ethVerificationCtrl started");

        GAuth.checkAuth().then(
            function () {
                $log.debug('[ethVerificationCtrl] GAuth.checkAuth(): success');
                $rootScope.getUserData(); // async
            }, // if error:
            function () {

                $log.debug('[ethVerificationCtrl] GAuth.checkAuth(): error');
                // see: https://github.com/maximepvrt/angular-google-gapi/tree/master#signup-with-google
                GAuth.login().then(function (user) {
                    // if pop-up in browser does not work we use a button with $rootScope.login();
                    $log.debug('[ethVerificationCtrl]' + user.name + ' is logged in:');
                    $log.debug(user);
                    $rootScope.checkAuth(); // this includes $rootScope.getUserData() // if we use login button this will be triggered by $rootScope.login()
                    // your application can access their Google account
                }, function () {
                    $log.debug('[ethereumVerificationCtrl} login failed');
                });

            }
        );

        //
        $log.info("[ethVerification] $stateParams.fingerprint : " + $stateParams.fingerprint);
        // --- Alerts:
        $scope.alertDanger = null;  // red
        $scope.alertWarning = null; // yellow
        $scope.alertInfo = null;    // blue
        $scope.alertSuccess = null; // green
        //
        $scope.error = {};
        $scope.fingerprint = $stateParams.fingerprint;
        $scope.keyId = "0x" + $stateParams.fingerprint.substring(32, 40).toUpperCase();
        $scope.todayDate = new Date();
        $scope.pgpPublicKey = null;
        $scope.getPGPPublicKeyByFingerprintError = null;

        var contractData = {
            "1": {"contractAddress": ""},
            "3": {"contractAddress": ""},
            "4": { // Rinkeby
                "contractAddress": "0x001672c61A3cE56d0599A81f2F28103A891a1A39",
                "ownerAddress": "0x3fAB7ebe4B2c31a75Cf89210aeDEfc093928A87D"
            }
        };

        var networks = {
            "1": "Main Ethereum Network",
            "3": "Ropsten Test Network",
            "4": "Rinkeby Test Network"
        };

        var etherscanLinkPrefix = {
            "1": "https://etherscan.io/",
            "3": "https://ropsten.etherscan.io/",
            "4": "https://rinkeby.etherscan.io/"
        };

        $rootScope.currentNetwork = {
            'network_id': '', // integer
            'networkName': '',
            'node': '',
            'ethereumProtocolVersion': '',
            'connected': false
        };

        $log.debug('test point 1');
        /* web3 instantiation */
        // to access web3 instance in browser console:
        // angular.element('body').scope().$root.web3
        // see 'NOTE FOR DAPP DEVELOPERS' on https://github.com/ethereum/mist/releases/tag/v0.9.0
        // To instantiate your (self-included) web3.js lib you can use:
        if (typeof window.web3 !== 'undefined') {
            $log.debug('[ethVerificationCtrl] web3 object presented by provider:');
            $log.debug(window.web3.currentProvider);
            $rootScope.web3 = new Web3(window.web3.currentProvider);
            $log.debug('[ethVerificationCtrl] and will be used in $rootScope.web3:');
            $log.debug($rootScope.web3);
        } else {
            $log.debug('[ethVerificationCtrl] web3 object is not provided by client app');
            $log.debug('[ethVerificationCtrl] and will be instantiated from web3.js lib');
            try {
                $rootScope.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
                $log.debug('[ethVerificationCtrl] $rootScope.web3: ');
                $log.debug($rootScope.web3);
            } catch (error) {
                $log.error(error);
                $scope.alertDanger = error;
            }
        }

        // >>>> Start execution:
        if ($rootScope.web3.isConnected()) {

            $log.debug('[ethVerificationCtrl] $rootScope.web3.isConnected() : true ');
            $rootScope.currentNetwork.connected = true;
            // $rootScope.$apply();

            $rootScope.web3.version.getNetwork(function (error, result) {
                if (error) {
                    $scope.alertDanger = error;
                    $scope.$apply();
                    $log.error(error);
                } else {
                    $rootScope.currentNetwork.network_id = result; // "3" for Ropsten, "1" for MainNet etc.
                    $rootScope.currentNetwork.networkName = networks[result]; // "3" for Ropsten, "1" for MainNet etc.
                    $rootScope.etherscanLinkPrefix = etherscanLinkPrefix[result]; // "3" for Ropsten, "1" for MainNet etc.

                    $rootScope.$apply(); // needed here
                    $scope.$apply(); // needed here
                    $log.debug(
                        '[ethVerificationCtrl] web3.version.network: '
                        + $rootScope.currentNetwork.network_id
                    );
                    // >>> start creating contract instance
                    $.getJSON(
                        'app/ethereum/CryptonomicaVerification.json', // see: https://github.com/trufflesuite/truffle-contract-schema
                        function (data) { // async

                            $log.debug('[ethVerificationCtrl] app/ethereum/CryptonomicaVerification.json :');
                            $log.debug(data);

                            var CryptonomicaVerificationContract = TruffleContract(data);
                            CryptonomicaVerificationContract.setProvider($rootScope.web3.currentProvider);

                            var contractAddress = contractData[$rootScope.currentNetwork.network_id].contractAddress;
                            $log.debug('[ethVerificationCtrl] contractAddress: ', contractAddress);

                            // >>>
                            CryptonomicaVerificationContract.at(contractAddress).then(
                                function (instance) {

                                    $scope.contract = instance;
                                    $scope.$apply();
                                    $log.debug('[ethVerificationCtrl] $scope.contract:');
                                    $log.debug($scope.contract);

                                    GApi.executeAuth(
                                        'pgpPublicKeyAPI',
                                        'getPGPPublicKeyByFingerprint',
                                        {"fingerprint": $stateParams.fingerprint}
                                    ).then(
                                        function (pgpPublicKeyGeneralView) {
                                            $scope.pgpPublicKey = pgpPublicKeyGeneralView;
                                            $log.debug("[ethVerificationCtrl] $scope.pgpPublicKey: ");
                                            $log.debug($scope.pgpPublicKey);

                                            if (!$scope.pgpPublicKey.verified) {
                                                $scope.alertDanger = 'This key is not verified';
                                                return;
                                            }

                                            // get network info:

                                            $rootScope.web3.version.getNode(function (error, result) {
                                                if (error) {
                                                    $log.debug(error);
                                                } else {
                                                    $rootScope.currentNetwork.node = result;
                                                    $rootScope.$apply();
                                                    $log.debug('[ethVerificationCtrl] web3.version.node: ' + $rootScope.currentNetwork.node);
                                                    // "Geth/v1.7.2-stable-1db4ecdc/linux-amd64/go1.9"
                                                }
                                            });

                                            $rootScope.web3.version.getEthereum(function (error, result) {
                                                if (error) {
                                                    $log.debug(error);
                                                } else {
                                                    $rootScope.currentNetwork.ethereumProtocolVersion = result;
                                                    $rootScope.$apply();
                                                    $log.debug('[ethVerificationCtrl] web3.version.ethereum: ' + $rootScope.currentNetwork.ethereumProtocolVersion);
                                                    // the Ethereum protocol version (like: web3.version.ethereum: 0x3f )
                                                }
                                            });

                                            if ($rootScope.web3.eth.defaultAccount) {
                                                $scope.ethAccount = $rootScope.web3.eth.defaultAccount;
                                            } else if ($rootScope.web3.eth.accounts[0]) {
                                                $scope.ethAccount = $rootScope.web3.eth.accounts[0];
                                                $rootScope.web3.eth.defaultAccount = $rootScope.web3.eth.accounts[0];
                                            } else {
                                                $scope.alertDanger = "Ethereum Account not recognized"
                                            }

                                            // add functions to buttons:

                                            $scope.requestStringToSignWithKey = function () {
                                                $scope.requestStringToSignWithKeyWorking = true;
                                                $log.debug('$scope.requestStringToSignWithKey starts');
                                                $scope.requestStringToSignWithKeyTx = null;
                                                var txParameters = {};
                                                txParameters.from = $scope.ethAccount;
                                                txParameters.gas = 300000; // see: https://rinkeby.etherscan.io/tx/0xb81034db37d0feee9677b2d81dddbab99269ca1dd276ee6c751d49c61cac6b09
                                                $log.debug('$scope.requestStringToSignWithKey txParameters: ');
                                                $log.debug(txParameters);
                                                // $scope.contract.requestStringToSignWithKey($scope.fingerprint, txParameters).then(
                                                $scope.contract.requestStringToSignWithKey($scope.fingerprint, txParameters).then(
                                                    function (tx) {
                                                        $log.debug('[ethVerificationCtrl] $scope.contract.requestStringToSignWithKey result:');
                                                        $log.debug(tx);
                                                        $scope.requestStringToSignWithKeyTx = tx;
                                                        $scope.contract.stringToSign.call($scope.ethAccount).then(function (stringToSign) {
                                                                $scope.stringToSign = stringToSign;
                                                                $log.debug('[ethVerificationCtrl] $scope.stringToSign:');
                                                                $log.debug($scope.stringToSign);
                                                                $scope.requestStringToSignWithKeyWorking = false;
                                                                $scope.$apply();
                                                            }
                                                        ).catch(function (error) {
                                                                $scope.alertDanger = error.toString();
                                                                $log.error(error);
                                                                $scope.requestStringToSignWithKeyWorking = false;
                                                                $scope.$apply();
                                                            }
                                                        );
                                                    }
                                                ).catch(function (error) {
                                                        $scope.alertDanger = error.toString();
                                                        $log.error(error);
                                                        $scope.requestStringToSignWithKeyWorking = false;
                                                        $scope.$apply();
                                                    }
                                                );
                                            };

                                            $scope.uploadSignedString = function () {
                                                $scope.uploadSignedStringWorking = true;
                                                $log.debug('$scope.uploadSignedString starts');
                                                $scope.uploadSignedStringTx = null;
                                                var txParameters = {};
                                                txParameters.from = $scope.ethAccount;
                                                txParameters.gas = 300000; //
                                                $log.debug('$scope.uploadSignedString txParameters: ');
                                                $log.debug(txParameters);
                                                // $scope.contract.requestStringToSignWithKey($scope.fingerprint, txParameters).then(
                                                $scope.contract.requestStringToSignWithKey($scope.fingerprint, txParameters).then(
                                                    function (tx) {
                                                        $log.debug('[ethVerificationCtrl] $scope.contract.requestStringToSignWithKey result:');
                                                        $log.debug(tx);
                                                        $scope.requestStringToSignWithKeyTx = tx;
                                                        $scope.contract.stringToSign.call($scope.ethAccount).then(function (stringToSign) {
                                                                $scope.stringToSign = stringToSign;
                                                                $log.debug('[ethVerificationCtrl] $scope.stringToSign:');
                                                                $log.debug($scope.stringToSign);
                                                                $scope.requestStringToSignWithKeyWorking = false;
                                                                $scope.$apply();
                                                            }
                                                        ).catch(function (error) {
                                                                $scope.alertDanger = error.toString();
                                                                $log.error(error);
                                                                $scope.requestStringToSignWithKeyWorking = false;
                                                                $scope.$apply();
                                                            }
                                                        );
                                                    }
                                                ).catch(function (error) {
                                                        $scope.alertDanger = error.toString();
                                                        $log.error(error);
                                                        $scope.requestStringToSignWithKeyWorking = false;
                                                        $scope.$apply();
                                                    }
                                                );
                                            }



                                            // TODO: continue here


                                        }, function (getPGPPublicKeyByFingerprintError) {
                                            $scope.getPGPPublicKeyByFingerprintError = getPGPPublicKeyByFingerprintError;
                                            $log.debug("$scope.getPGPPublicKeyByFingerprintError : ");
                                            $log.error($scope.getPGPPublicKeyByFingerprintError);
                                            $scope.$apply();
                                        })
                                } // end of function (instance) {
                            )

                        } // end of function (data)
                    ); // end of $.getJSON(

                }
            });
        } else {
            $rootScope.web3isConnected = false;
            $scope.alertDanger = "Please use Google Chrome with MetaMask plugin or Mist Browser";
            $log.error('[ethereumVerificationCtrl] web3 is not connected to Ethereum node');
            return;
        }
    } // end of Ctrl
]);

