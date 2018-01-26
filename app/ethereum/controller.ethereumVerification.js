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
    'uiUploader',
    '$log',
    '$cookies',
    '$timeout',
    '$window',
    '$stateParams',
    function ethereumVerificationCtrl($scope,    // <- name for debugging
                                      $sce,
                                      $rootScope,
                                      $http,
                                      GApi,
                                      GAuth,
                                      GData,
                                      $state,
                                      uiUploader,
                                      $log,
                                      $cookies,
                                      $timeout,
                                      $window,
                                      $stateParams) {

        $log.info("cryptonomica.controller.ethereumVerification ver. 01 started");

        if (!$rootScope.currentUser) {
            GAuth.checkAuth().then(
                function () {
                    $rootScope.getUserData(); // async?
                },
                function () {
                    $log.debug('User not logged in');
                    $state.go('landing');
                }
            );
        }

        //
        $log.info("[ethereumVerification] $stateParams.fingerprint : " + $stateParams.fingerprint);
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

        $rootScope.currentNetwork = {
            'network_id': '', // integer
            'node': '',
            'ethereumProtocolVersion': '',
            'connected': false
        };

        /* web3 instantiation */
        // to access web3 instance in browser console:
        // angular.element('body').scope().$root.web3
        // see 'NOTE FOR DAPP DEVELOPERS' on https://github.com/ethereum/mist/releases/tag/v0.9.0
        // To instantiate your (self-included) web3.js lib you can use:
        if (typeof window.web3 !== 'undefined') {
            $log.debug('[app.js] web3 object presented by provider:');
            $log.debug(window.web3.currentProvider);
            $rootScope.web3 = new Web3(window.web3.currentProvider);
            $log.debug('and will be used in $rootScope.web3:');
            $log.debug($rootScope.web3);
        } else {
            $log.debug('web3 object is not provided by client app');
            $log.debug('and will be instantiated from web3.js lib');

            try {
                $rootScope.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
                $log.debug('$rootScope.web3: ');
                $log.debug($rootScope.web3);
            } catch(error) {
                $log.error(error);

            }




        }
        // check if web3 is connected to Ethereum node:
        // to work with Ropsten run:
        // geth --fast --cache=1048 --testnet --rpc --rpcapi "eth,net,web3" --rpccorsdomain '*' --rpcaddr localhost --rpcport 8545

        var mainFunction = function () {
            $.getJSON(
                'app/ethereum/CryptonomicaVerification.json', // see: https://github.com/trufflesuite/truffle-contract-schema
                function (data) { // async
                    var CryptonomicaVerificationContract = TruffleContract(data);
                    CryptonomicaVerificationContract.at(contractData[$rootScope.currentNetwork.network_id].contractAddress)
                        .then(
                            function (instance) {
                                $scope.contract = instance;
                                $scope.$apply();
                                $log.debug("$scope.contract.address: ", $scope.contract.address);
                                GApi.executeAuth(
                                    'pgpPublicKeyAPI',
                                    'getPGPPublicKeyByFingerprint',
                                    {"fingerprint": $stateParams.fingerprint}
                                ).then(
                                    function (pgpPublicKeyGeneralView) {
                                        $scope.pgpPublicKey = pgpPublicKeyGeneralView;
                                        $log.debug("$scope.pgpPublicKey: ");
                                        $log.debug($scope.pgpPublicKey);

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
        }; // end of mainFunction()

        // >>>> Start execution:
        if ($rootScope.web3.isConnected()) {

            $rootScope.currentNetwork.connected = true;
            $rootScope.$apply();

            $rootScope.web3.version.getNetwork(function (error, result) {
                if (error) {
                    $scope.alertDanger = error;
                    $scope.$apply();
                    $log.error(error);
                } else {
                    $rootScope.currentNetwork.network_id = result; // "3" for Ropsten, "1" for MainNet etc.
                    $rootScope.$apply(); // needed here
                    $scope.$apply(); // needed here
                    $log.debug(
                        '[token] web3.version.network: '
                        + $rootScope.currentNetwork.network_id
                    );

                    if (!$rootScope.currentUser) {
                        $log.debug(' if (!$rootScope.currentUser) started:');
                        $rootScope.progressbar.start();
                        GApi.executeAuth('cryptonomicaUserAPI', 'getMyUserData')
                            .then(
                                function (resp) {
                                    $rootScope.currentUser = resp;
                                    $rootScope.userCurrentImageLink = $sce.trustAsResourceUrl(resp.userCurrentImageLink); //;
                                    $log.info("$rootScope.currentUser: ");
                                    $log.info($rootScope.currentUser);
                                    $timeout($rootScope.progressbar.complete(), 1000);
                                    mainFunction(); // <<<
                                }, function (error) {
                                    // console.log("$rootScope.getUserData: error: ");
                                    $log.error(error);
                                    $timeout($rootScope.progressbar.complete(), 1000); //
                                });
                    } else {
                        mainFunction(); // <<<
                    }

                }
            });
        } else {
            $rootScope.web3isConnected = false;
            $scope.alertDanger = "Please use Google Chrome with MetaMask plugin or Mist Browser";
            $log.error('[app.run] web3 is not connected to Ethereum node');
            return;
        }
    } // end of Ctrl
]);

