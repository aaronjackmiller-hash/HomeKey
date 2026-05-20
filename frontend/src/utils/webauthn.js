const decodeBase64Url = (input) => {
  const normalized = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const encodeBase64Url = (input) => {
  const bytes = input instanceof ArrayBuffer
    ? new Uint8Array(input)
    : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const toPublicKeyCredentialDescriptor = (descriptor) => ({
  ...descriptor,
  id: decodeBase64Url(descriptor.id),
});

const toCreationOptions = (optionsJSON) => ({
  ...optionsJSON,
  challenge: decodeBase64Url(optionsJSON.challenge),
  user: {
    ...optionsJSON.user,
    id: decodeBase64Url(optionsJSON.user.id),
  },
  excludeCredentials: (optionsJSON.excludeCredentials || []).map(toPublicKeyCredentialDescriptor),
});

const toRequestOptions = (optionsJSON) => ({
  ...optionsJSON,
  challenge: decodeBase64Url(optionsJSON.challenge),
  allowCredentials: (optionsJSON.allowCredentials || []).map(toPublicKeyCredentialDescriptor),
});

const toRegistrationJSON = (credential) => {
  const { response } = credential;
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults?.() || {},
    response: {
      attestationObject: encodeBase64Url(response.attestationObject),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
      publicKeyAlgorithm: response.getPublicKeyAlgorithm?.() || undefined,
      authenticatorData: response.getAuthenticatorData ? encodeBase64Url(response.getAuthenticatorData()) : undefined,
      publicKey: response.getPublicKey ? encodeBase64Url(response.getPublicKey()) : undefined,
    },
    authenticatorAttachment: credential.authenticatorAttachment || undefined,
  };
};

const toAuthenticationJSON = (credential) => {
  const { response } = credential;
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults?.() || {},
    response: {
      authenticatorData: encodeBase64Url(response.authenticatorData),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      signature: encodeBase64Url(response.signature),
      userHandle: response.userHandle ? encodeBase64Url(response.userHandle) : undefined,
    },
    authenticatorAttachment: credential.authenticatorAttachment || undefined,
  };
};

export const startRegistration = async ({ optionsJSON }) => {
  const credential = await navigator.credentials.create({
    publicKey: toCreationOptions(optionsJSON),
  });
  if (!credential) {
    throw new Error('No passkey credential was created.');
  }
  return toRegistrationJSON(credential);
};

export const startAuthentication = async ({ optionsJSON }) => {
  const assertion = await navigator.credentials.get({
    publicKey: toRequestOptions(optionsJSON),
  });
  if (!assertion) {
    throw new Error('No passkey credential was returned.');
  }
  return toAuthenticationJSON(assertion);
};
