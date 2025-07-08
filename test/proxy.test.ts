import * as vscode from 'vscode';
import { requestShouldBeProxied } from '../src/json-schema-content-provider';
import assert = require('assert');

class Getable {
  constructor(obj: { [key: string]: unknown }) {
    Object.assign(this, obj);
  }

  get<T>(key: string): T {
    return this[key];
  }
}

function workspaceConfiguration(obj: { [key: string]: unknown }): vscode.WorkspaceConfiguration {
  return (new Getable(obj) as unknown) as vscode.WorkspaceConfiguration;
}

describe('#requestShouldBeProxied', () => {
  describe('when http.proxy is empty', () => {
    it('should return false', () => {
      assert.equal(
        requestShouldBeProxied(
          'https://google.com',
          workspaceConfiguration({
            proxy: '',
          })
        ),
        false
      );
    });
  });

  describe(`when http.proxy is set`, () => {
    describe('when http.noProxy is empty', () => {
      const httpSettings = workspaceConfiguration({
        proxy: 'https://localhost:8080',
        noProxy: [],
      });

      it('should return true', () => {
        assert.equal(requestShouldBeProxied('https://google.com', httpSettings), true);
        assert.equal(requestShouldBeProxied('http://something.example.com', httpSettings), true);
        assert.equal(requestShouldBeProxied('http://localhost/path', httpSettings), true);
        assert.equal(requestShouldBeProxied('http://127.0.0.1/path', httpSettings), true);
      });
    });

    describe('when http.noProxy has items', () => {
      const httpSettings = workspaceConfiguration({
        proxy: 'https://localhost:8080',
        noProxy: ['*.example.com', 'localhost', '127.0.0.1'],
      });

      it('should return true when uri does not match noProxy', () => {
        assert.equal(requestShouldBeProxied('http://google.com', httpSettings), true);
        assert.equal(requestShouldBeProxied('http://example.com', httpSettings), true);
      });

      it('should return false when uri matches noProxy', () => {
        assert.equal(requestShouldBeProxied('http://something.example.com/path', httpSettings), false);
        assert.equal(requestShouldBeProxied('http://localhost/path', httpSettings), false);
        assert.equal(requestShouldBeProxied('http://127.0.0.1/path', httpSettings), false);
      });
    });
  });
});
