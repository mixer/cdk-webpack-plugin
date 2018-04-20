import * as glob from 'glob';
import * as parse5 from 'parse5';
import * as path from 'path';

import { IPackageConfig } from '@mcph/miix-std/dist/internal';
import { MixerPluginError } from './errors';
import { readFile } from './fs';
import { createPackage } from './metadata/metadata';
import { getProjectPath, mustLoadPackageJson } from './npm';

/**
 * The HTMLInjector is a helper that is able to inject HTML fragments into
 * an HTML document.
 */
export abstract class HTMLInjector {
  constructor(private readonly filepath: string) {}

  public async render(compiler: any): Promise<string> {
    const parsed = await this.getDocument();
    const head = <parse5.AST.HtmlParser2.ParentNode>this.findNode(parsed, [
      'html',
      'head',
    ]);
    if (!head) {
      throw new MixerPluginError('Your homepage is missing a <head> section!');
    }

    this.prepend(head, ...(await this.injectHead(compiler)));

    const body = <parse5.AST.HtmlParser2.ParentNode>this.findNode(parsed, [
      'html',
      'body',
    ]);
    if (!body) {
      throw new MixerPluginError('Your homepage is missing a <body> section!');
    }

    // If there is a script tag already inside the body, let's not double up
    // just in case something breaks.
    const script = <parse5.AST.HtmlParser2.ParentNode>this.findNode(parsed, [
      'html',
      'body',
      'script',
    ]);
    if (!script) {
      this.append(body, ...(await this.injectBody(compiler)));
    }

    return parse5.serialize(parsed);
  }

  /**
   * injectHead returns a list of HTML fragments to insert into the page <head>.
   */
  protected async injectHead(_compiler: any): Promise<string[]> {
    return [];
  }

  /**
   * injectBody returns a list of HTML fragments to insert into the page <body>.
   */
  protected async injectBody(_compiler: any): Promise<string[]> {
    return [];
  }

  private async getDocument() {
    const og = await readFile(this.filepath);

    try {
      return <parse5.AST.HtmlParser2.Document>parse5.parse(og);
    } catch (e) {
      throw new Error(`Could not parse HTML from your homepage: ${e.stack}`);
    }
  }

  private prepend(parent: parse5.AST.HtmlParser2.Node, ...elements: string[]) {
    if (!(<any>parent).childNodes) {
      throw new Error('Attempted to append to non-parent node');
    }

    const casted = <parse5.AST.HtmlParser2.ParentNode>parent;
    elements.forEach(element =>
      casted.childNodes.unshift(this.stringToNode(element)),
    );
  }

  private append(parent: parse5.AST.HtmlParser2.Node, ...elements: string[]) {
    if (!(<any>parent).childNodes) {
      throw new Error('Attempted to append to non-parent node');
    }

    const casted = <parse5.AST.HtmlParser2.ParentNode>parent;
    elements.forEach(element =>
      casted.childNodes.push(this.stringToNode(element)),
    );
  }

  private stringToNode(src: string): parse5.AST.HtmlParser2.Node {
    const fragment = <parse5.AST.HtmlParser2.DocumentFragment>parse5.parseFragment(
      src,
    );
    return fragment.childNodes[0];
  }

  private findNode(
    parent: parse5.AST.HtmlParser2.Node,
    nodePath: string[],
  ): parse5.AST.HtmlParser2.Node | undefined {
    for (let i = 0; i < nodePath.length; i++) {
      if (!(<any>parent).childNodes) {
        return undefined;
      }

      const child = (<parse5.AST.HtmlParser2.ParentNode>parent).childNodes.find(
        n => (<parse5.AST.HtmlParser2.Element>n).tagName === nodePath[i],
      );

      if (!child) {
        return undefined;
      }

      parent = child;
    }

    return parent;
  }

  private findElement(
    parent: parse5.AST.HtmlParser2.Node,
    nodePath: string[],
  ): parse5.AST.HtmlParser2.Node | undefined {
    for (let i = 0; i < nodePath.length; i++) {
      if (!(<any>parent).childNodes) {
        return undefined;
      }

      const child = (<parse5.AST.HtmlParser2.ParentNode>parent).childNodes.find(
        n => (<parse5.AST.HtmlParser2.Element>n).tagName === nodePath[i],
      );

      if (!child) {
        return undefined;
      }

      parent = child;
    }

    return parent;
  }
}

/**
 * HomepageRenderer is responsible for modifying and injecting Mixer stdlib
 * scripts into the developer's index.html.
 */
export class HomepageRenderer extends HTMLInjector {
  constructor(
    filepath: string,
    private readonly packaged: IPackageConfig,
    private readonly locales: string[],
    private readonly unique?: string,
  ) {
    super(filepath);
  }

  protected async injectHead(): Promise<string[]> {
    return [
      `<script>window.mixerPackageConfig=${JSON.stringify(this.packaged)};` +
        `window.mixerLocales=${JSON.stringify(this.locales)}</script>`,
    ];
  }

  protected async injectBody(): Promise<string[]> {
    return [
      `<script src="./index${
        this.unique ? `.${this.unique}.` : '.'
      }js"></script>`,
    ];
  }
}
