/**
 * @license Copyright (c) 2003-2021, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import ModelTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/modeltesteditor';
import LinkCommand from '../src/linkcommand';
import ManualDecorator from '../src/utils/manualdecorator';
import { setData, getData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import AutomaticDecorators from '../src/utils/automaticdecorators';

describe( 'LinkCommand', () => {
	let editor, model, command;

	beforeEach( () => {
		return ModelTestEditor.create()
			.then( newEditor => {
				editor = newEditor;
				model = editor.model;
				command = new LinkCommand( editor );

				model.schema.extend( '$text', {
					allowIn: '$root',
					allowAttributes: [ 'linkHref', 'bold' ]
				} );

				model.schema.register( 'paragraph', { inheritAllFrom: '$block' } );
			} );
	} );

	afterEach( () => {
		return editor.destroy();
	} );

	describe( 'isEnabled', () => {
		// This test doesn't tests every possible case.
		// refresh() uses `isAttributeAllowedInSelection` helper which is fully tested in his own test.

		beforeEach( () => {
			model.schema.register( 'x', { inheritAllFrom: '$block' } );

			model.schema.addAttributeCheck( ( ctx, attributeName ) => {
				if ( ctx.endsWith( 'x $text' ) && attributeName == 'linkHref' ) {
					return false;
				}
			} );
		} );

		describe( 'when selection is collapsed', () => {
			it( 'should be true if characters with the attribute can be placed at caret position', () => {
				setData( model, '<paragraph>f[]oo</paragraph>' );
				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be false if characters with the attribute cannot be placed at caret position', () => {
				setData( model, '<x>fo[]o</x>' );
				expect( command.isEnabled ).to.be.false;
			} );
		} );

		describe( 'when selection is not collapsed', () => {
			it( 'should be true if there is at least one node in selection that can have the attribute', () => {
				setData( model, '<paragraph>[foo]</paragraph>' );
				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be false if there are no nodes in selection that can have the attribute', () => {
				setData( model, '<x>[foo]</x>' );
				expect( command.isEnabled ).to.be.false;
			} );

			describe( 'for block images', () => {
				beforeEach( () => {
					model.schema.register( 'image', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'linkHref' ] } );
				} );

				it( 'should be true when an image is selected', () => {
					setData( model, '[<image linkHref="foo"></image>]' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when an image and a text are selected', () => {
					setData( model, '[<image linkHref="foo"></image>Foo]' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when a text and an image are selected', () => {
					setData( model, '[Foo<image linkHref="foo"></image>]' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when two images are selected', () => {
					setData( model, '[<image linkHref="foo"></image><image linkHref="foo"></image>]' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be false when a fake image is selected', () => {
					model.schema.register( 'fake', { isBlock: true, allowWhere: '$text' } );

					setData( model, '[<fake></fake>]' );

					expect( command.isEnabled ).to.be.false;
				} );

				it( 'should be false if an image does not accept the `linkHref` attribute in given context', () => {
					model.schema.addAttributeCheck( ( ctx, attributeName ) => {
						if ( ctx.endsWith( '$root image' ) && attributeName == 'linkHref' ) {
							return false;
						}
					} );

					setData( model, '[<image></image>]' );

					expect( command.isEnabled ).to.be.false;
				} );
			} );

			describe( 'for inline images', () => {
				beforeEach( () => {
					model.schema.register( 'imageInline', {
						isObject: true,
						isInline: true,
						allowWhere: '$text',
						allowAttributes: [ 'linkHref' ]
					} );
				} );

				it( 'should be true when an image is selected', () => {
					setData( model, '<paragraph>foo [<imageInline linkHref="foo"></imageInline>]</paragraph>' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when an image and a text are selected', () => {
					setData( model, '<paragraph>foo [<imageInline linkHref="foo"></imageInline>bar]</paragraph>' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when a text and an image are selected', () => {
					setData( model, '<paragraph>[foo<imageInline linkHref="foo"></imageInline>]</paragraph>' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when two images are selected', () => {
					setData( model,
						'<paragraph>' +
							'foo ' +
							'[<imageInline linkHref="foo"></imageInline><imageInline linkHref="foo"></imageInline>]' +
						'</paragraph>' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be false if an image does not accept the `linkHref` attribute in given context', () => {
					model.schema.addAttributeCheck( ( ctx, attributeName ) => {
						if ( ctx.endsWith( 'imageInline' ) && attributeName == 'linkHref' ) {
							return false;
						}
					} );

					setData( model, '<paragraph>[<imageInline></imageInline>]</paragraph>' );

					expect( command.isEnabled ).to.be.false;
				} );
			} );
		} );
	} );

	describe( 'value', () => {
		describe( 'collapsed selection', () => {
			it( 'should be equal attribute value when selection is placed inside element with `linkHref` attribute', () => {
				setData( model, '<$text linkHref="url">foo[]bar</$text>' );

				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should be undefined when selection is placed inside element without `linkHref` attribute', () => {
				setData( model, '<$text bold="true">foo[]bar</$text>' );

				expect( command.value ).to.be.undefined;
			} );
		} );

		describe( 'non-collapsed selection', () => {
			it( 'should be equal attribute value when selection contains only elements with `linkHref` attribute', () => {
				setData( model, 'fo[<$text linkHref="url">ob</$text>]ar' );

				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should be undefined when selection contains not only elements with `linkHref` attribute', () => {
				setData( model, 'f[o<$text linkHref="url">ob</$text>]ar' );

				expect( command.value ).to.be.undefined;
			} );
		} );

		describe( 'for block images', () => {
			beforeEach( () => {
				model.schema.register( 'image', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'linkHref' ] } );
			} );

			it( 'should read the value from a selected image', () => {
				setData( model, '[<image linkHref="foo"></image>]' );

				expect( command.value ).to.be.equal( 'foo' );
			} );

			it( 'should read the value from a selected image and ignore a text node', () => {
				setData( model,
					'[<image linkHref="foo"></image>' +
					'<paragraph><$text linkHref="bar">bar</$text>]</paragraph>'
				);

				expect( command.value ).to.be.equal( 'foo' );
			} );

			it( 'should read the value from a selected text node and ignore an image', () => {
				setData( model, '<paragraph>[<$text linkHref="bar">bar</$text></paragraph><image linkHref="foo"></image>]' );

				expect( command.value ).to.be.equal( 'bar' );
			} );

			it( 'should be undefined when a fake image is selected', () => {
				model.schema.register( 'fake', { isBlock: true, allowWhere: '$text' } );

				setData( model, '[<fake></fake>]' );

				expect( command.value ).to.be.undefined;
			} );
		} );

		describe( 'for inline images', () => {
			beforeEach( () => {
				model.schema.register( 'imageInline', {
					isObject: true,
					isInline: true,
					allowWhere: '$text',
					allowAttributes: [ 'linkHref' ]
				} );
			} );

			it( 'should read the value from a selected image', () => {
				setData( model, '<paragraph>[<imageInline linkHref="foo"></imageInline>]</paragraph>' );

				expect( command.value ).to.be.equal( 'foo' );
			} );

			// NOTE: The command value should most likely be "foo" but this requires a lot changes in refresh()
			// because it relies on getSelectedElement()/getSelectedBlocks() and neither will return the inline widget
			// in this case.
			it( 'should not read the value from a selected image when a linked text follows it', () => {
				setData( model, '<paragraph>[<imageInline linkHref="foo"></imageInline><$text linkHref="bar">bar</$text>]</paragraph>' );

				expect( command.value ).to.be.undefined;
			} );

			it( 'should read the value from a selected text node and ignore an image', () => {
				setData( model, '<paragraph>[<$text linkHref="bar">bar</$text><imageInline linkHref="foo"></imageInline>]</paragraph>' );

				expect( command.value ).to.be.equal( 'bar' );
			} );
		} );
	} );

	describe( 'execute()', () => {
		describe( 'non-collapsed selection', () => {
			it( 'should set `linkHref` attribute to selected text', () => {
				setData( model, 'f[ooba]r' );

				expect( command.value ).to.be.undefined;

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( 'f[<$text linkHref="url">ooba</$text>]r' );
				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should set `linkHref` attribute to selected text when text already has attributes', () => {
				setData( model, 'f[o<$text bold="true">oba]r</$text>' );

				expect( command.value ).to.be.undefined;

				command.execute( 'url' );

				expect( command.value ).to.equal( 'url' );
				expect( getData( model ) ).to.equal(
					'f[<$text linkHref="url">o</$text>' +
					'<$text bold="true" linkHref="url">oba</$text>]' +
					'<$text bold="true">r</$text>'
				);
			} );

			it( 'should overwrite existing `linkHref` attribute when selected text wraps text with `linkHref` attribute', () => {
				setData( model, 'f[o<$text linkHref="other url">o</$text>ba]r' );

				expect( command.value ).to.be.undefined;

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( 'f[<$text linkHref="url">ooba</$text>]r' );
				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should split text and overwrite attribute value when selection is inside text with `linkHref` attribute', () => {
				setData( model, 'f<$text linkHref="other url">o[ob]a</$text>r' );

				expect( command.value ).to.equal( 'other url' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal(
					'f' +
					'<$text linkHref="other url">o</$text>' +
					'[<$text linkHref="url">ob</$text>]' +
					'<$text linkHref="other url">a</$text>' +
					'r'
				);
				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should overwrite `linkHref` attribute of selected text only, ' +
				'when selection start inside text with `linkHref` attribute',
			() => {
				setData( model, 'f<$text linkHref="other url">o[o</$text>ba]r' );

				expect( command.value ).to.equal( 'other url' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( 'f<$text linkHref="other url">o</$text>[<$text linkHref="url">oba</$text>]r' );
				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should overwrite `linkHref` attribute of selected text only, when selection end inside text with `linkHref` ' +
				'attribute', () => {
				setData( model, 'f[o<$text linkHref="other url">ob]a</$text>r' );

				expect( command.value ).to.be.undefined;

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( 'f[<$text linkHref="url">oob</$text>]<$text linkHref="other url">a</$text>r' );
				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should set `linkHref` attribute to selected text when text is split by $block element', () => {
				setData( model, '<paragraph>f[oo</paragraph><paragraph>ba]r</paragraph>' );

				expect( command.value ).to.be.undefined;

				command.execute( 'url' );

				expect( getData( model ) ).to.equal(
					'<paragraph>f[<$text linkHref="url">oo</$text></paragraph><paragraph><$text linkHref="url">ba</$text>]r</paragraph>'
				);
				expect( command.value ).to.equal( 'url' );
			} );

			describe( 'for block elements allowing linkHref', () => {
				it( 'should set `linkHref` attribute to allowed elements', () => {
					model.schema.register( 'image', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'linkHref' ] } );

					setData( model, '<paragraph>f[oo<image></image>ba]r</paragraph>' );

					expect( command.value ).to.be.undefined;

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>' +
							'f[<$text linkHref="url">oo</$text><image linkHref="url"></image><$text linkHref="url">ba</$text>]r' +
						'</paragraph>'
					);
					expect( command.value ).to.equal( 'url' );
				} );

				it( 'should set `linkHref` attribute to nested allowed elements', () => {
					model.schema.register( 'image', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'linkHref' ] } );
					model.schema.register( 'blockQuote', { allowWhere: '$block', allowContentOf: '$root' } );

					setData( model, '<paragraph>foo</paragraph>[<blockQuote><image></image></blockQuote>]<paragraph>bar</paragraph>' );

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>foo</paragraph>[<blockQuote><image linkHref="url"></image></blockQuote>]<paragraph>bar</paragraph>' );
				} );

				it( 'should set `linkHref` attribute to allowed elements on multi-selection', () => {
					model.schema.register( 'image', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'linkHref' ] } );

					setData( model, '<paragraph>[<image></image>][<image></image>]</paragraph>' );

					command.execute( 'url' );

					expect( getData( model ) )
						.to.equal( '<paragraph>[<image linkHref="url"></image>][<image linkHref="url"></image>]</paragraph>' );
				} );

				it( 'should set `linkHref` attribute to allowed elements and omit disallowed', () => {
					model.schema.register( 'image', { isBlock: true, allowWhere: '$text' } );
					model.schema.register( 'caption', { allowIn: 'image' } );
					model.schema.extend( '$text', { allowIn: 'caption' } );

					setData( model, '<paragraph>f[oo<image><caption>xxx</caption></image>ba]r</paragraph>' );

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>' +
							'f[<$text linkHref="url">oo</$text>' +
							'<image><caption><$text linkHref="url">xxx</$text></caption></image>' +
							'<$text linkHref="url">ba</$text>]r' +
						'</paragraph>'
					);
				} );

				it( 'should set `linkHref` attribute to allowed elements and omit their children even if they accept the attribute', () => {
					model.schema.register( 'image', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'linkHref' ] } );
					model.schema.register( 'caption', { allowIn: 'image' } );
					model.schema.extend( '$text', { allowIn: 'caption' } );

					setData( model, '<paragraph>f[oo<image><caption>xxx</caption></image>ba]r</paragraph>' );

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>' +
							'f[<$text linkHref="url">oo</$text>' +
							'<image linkHref="url"><caption>xxx</caption></image>' +
							'<$text linkHref="url">ba</$text>]r' +
						'</paragraph>'
					);
				} );
			} );

			describe( 'for inline elements allowing linkHref', () => {
				it( 'should set `linkHref` attribute to allowed elements', () => {
					model.schema.register( 'imageInline', {
						isObject: true,
						isInline: true,
						allowWhere: '$text',
						allowAttributes: [ 'linkHref' ]
					} );

					setData( model, '<paragraph>f[oo<imageInline></imageInline>ba]r</paragraph>' );

					expect( command.value ).to.be.undefined;

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>' +
							'f[<$text linkHref="url">oo</$text>' +
							'<imageInline linkHref="url"></imageInline>' +
							'<$text linkHref="url">ba</$text>]r' +
						'</paragraph>'
					);

					expect( command.value ).to.equal( 'url' );
				} );

				it( 'should set `linkHref` attribute to nested allowed elements', () => {
					model.schema.register( 'imageInline', {
						isObject: true,
						isInline: true,
						allowWhere: '$text',
						allowAttributes: [ 'linkHref' ]
					} );
					model.schema.register( 'blockQuote', { allowWhere: '$block', allowContentOf: '$root' } );

					setData( model,
						'<paragraph>foo</paragraph>' +
							'[<blockQuote><imageInline></imageInline></blockQuote>]' +
						'<paragraph>bar</paragraph>'
					);

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>foo</paragraph>' +
							'[<blockQuote><imageInline linkHref="url"></imageInline></blockQuote>]' +
						'<paragraph>bar</paragraph>'
					);
				} );

				it( 'should set `linkHref` attribute to allowed elements on multi-selection', () => {
					model.schema.register( 'imageInline', {
						isObject: true,
						isInline: true,
						allowWhere: '$text',
						allowAttributes: [ 'linkHref' ]
					} );

					setData( model, '<paragraph>[<imageInline></imageInline>][<imageInline></imageInline>]</paragraph>' );

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>[<imageInline linkHref="url"></imageInline>][<imageInline linkHref="url"></imageInline>]</paragraph>'
					);
				} );
			} );
		} );

		describe( 'collapsed selection', () => {
			it( 'should insert text with `linkHref` attribute, text data equal to href and put the selection after the new link', () => {
				setData( model, 'foo[]bar' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( 'foo<$text linkHref="url">url</$text>[]bar' );
			} );

			it( 'should insert text with `linkHref` attribute, and selection attributes', () => {
				setData( model, '<$text bold="true">foo[]bar</$text>', {
					selectionAttributes: { bold: true }
				} );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal(
					'<$text bold="true">foo</$text><$text bold="true" linkHref="url">url</$text><$text bold="true">[]bar</$text>'
				);
			} );

			it( 'should update `linkHref` attribute (text with `linkHref` attribute) and put the selection after the node', () => {
				setData( model, '<$text linkHref="other url">foo[]bar</$text>' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( '<$text linkHref="url">foobar</$text>[]' );
			} );

			it( 'should not insert text with `linkHref` attribute when is not allowed in parent', () => {
				model.schema.addAttributeCheck( ( ctx, attributeName ) => {
					if ( ctx.endsWith( 'paragraph $text' ) && attributeName == 'linkHref' ) {
						return false;
					}
				} );

				setData( model, '<paragraph>foo[]bar</paragraph>' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( '<paragraph>foo[]bar</paragraph>' );
			} );

			it( 'should not insert text node if link is empty', () => {
				setData( model, '<paragraph>foo[]bar</paragraph>' );

				command.execute( '' );

				expect( getData( model ) ).to.equal( '<paragraph>foo[]bar</paragraph>' );
			} );

			// https://github.com/ckeditor/ckeditor5/issues/8210
			it( 'should insert text with `linkHref` attribute just after text node with the same `linkHref` attribute', () => {
				setData( model, '<$text linkHref="url">foo</$text>[]bar' );

				model.change( writer => writer.overrideSelectionGravity() );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( '<$text linkHref="url">foourl</$text>[]bar' );
			} );
		} );
	} );

	describe( 'manual decorators', () => {
		beforeEach( () => {
			editor.destroy();
			return ModelTestEditor.create()
				.then( newEditor => {
					editor = newEditor;
					model = editor.model;
					command = new LinkCommand( editor );

					command.manualDecorators.add( new ManualDecorator( {
						id: 'linkIsFoo',
						label: 'Foo',
						attributes: {
							class: 'Foo'
						}
					} ) );
					command.manualDecorators.add( new ManualDecorator( {
						id: 'linkIsBar',
						label: 'Bar',
						attributes: {
							target: '_blank'
						}
					} ) );
					command.manualDecorators.add( new ManualDecorator( {
						id: 'linkIsSth',
						label: 'Sth',
						attributes: {
							class: 'sth'
						},
						defaultValue: true
					} ) );

					model.schema.extend( '$text', {
						allowIn: '$root',
						allowAttributes: [ 'linkHref', 'linkIsFoo', 'linkIsBar', 'linkIsSth' ]
					} );

					model.schema.register( 'image', {
						allowIn: '$root',
						isObject: true,
						isBlock: true,
						allowAttributes: [ 'linkHref', 'linkIsFoo', 'linkIsBar', 'linkIsSth' ]
					} );

					model.schema.register( 'imageInline', {
						isObject: true,
						isInline: true,
						allowWhere: '$text',
						allowAttributes: [ 'linkHref', 'linkIsFoo', 'linkIsBar', 'linkIsSth' ]
					} );

					model.schema.register( 'paragraph', { inheritAllFrom: '$block' } );
				} );
		} );

		afterEach( () => {
			return editor.destroy();
		} );

		describe( 'collapsed selection', () => {
			it( 'should insert additional attributes to link when it is created', () => {
				setData( model, 'foo[]bar' );

				command.execute( 'url', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal( 'foo<$text linkHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true">url</$text>[]bar' );
			} );

			it( 'should add additional attributes to link when link is modified', () => {
				setData( model, 'f<$text linkHref="url">o[]oba</$text>r' );

				command.execute( 'url', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal( 'f<$text linkHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true">ooba</$text>[]r' );
			} );

			it( 'should remove additional attributes to link if those are falsy', () => {
				setData( model, 'foo<$text linkHref="url" linkIsBar="true" linkIsFoo="true">u[]rl</$text>bar' );

				command.execute( 'url', { linkIsFoo: false, linkIsBar: false } );

				expect( getData( model ) ).to.equal( 'foo<$text linkHref="url">url</$text>[]bar' );
			} );
		} );

		describe( 'range selection', () => {
			it( 'should insert additional attributes to link when it is created', () => {
				setData( model, 'f[ooba]r' );

				command.execute( 'url', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal( 'f[<$text linkHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true">ooba</$text>]r' );
			} );

			it( 'should add additional attributes to link when link is modified', () => {
				setData( model, 'f[<$text linkHref="foo">ooba</$text>]r' );

				command.execute( 'url', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal( 'f[<$text linkHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true">ooba</$text>]r' );
			} );

			it( 'should remove additional attributes to link if those are falsy', () => {
				setData( model, 'foo[<$text linkHref="url" linkIsBar="true" linkIsFoo="true">url</$text>]bar' );

				command.execute( 'url', { linkIsFoo: false, linkIsBar: false } );

				expect( getData( model ) ).to.equal( 'foo[<$text linkHref="url">url</$text>]bar' );
			} );

			it( 'should insert additional attributes to an image when it is created', () => {
				setData( model, '[<image></image>]' );

				command.execute( 'url', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal( '[<image linkHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true"></image>]' );
			} );

			it( 'should insert additional attributes to an inline image when it is created', () => {
				setData( model, '<paragraph>foo[<imageInline></imageInline>]bar</paragraph>' );

				command.execute( 'url', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to.equal(
					'<paragraph>' +
						'foo[<imageInline linkHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true"></imageInline>]bar' +
					'</paragraph>'
				);
			} );
		} );

		describe( 'restoreManualDecoratorStates()', () => {
			it( 'synchronize values with current model state', () => {
				setData( model, 'foo<$text linkHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true">u[]rl</$text>bar' );

				expect( decoratorStates( command.manualDecorators ) ).to.deep.equal( {
					linkIsFoo: true,
					linkIsBar: true,
					linkIsSth: true
				} );

				command.manualDecorators.first.value = false;

				expect( decoratorStates( command.manualDecorators ) ).to.deep.equal( {
					linkIsFoo: false,
					linkIsBar: true,
					linkIsSth: true
				} );

				command.restoreManualDecoratorStates();

				expect( decoratorStates( command.manualDecorators ) ).to.deep.equal( {
					linkIsFoo: true,
					linkIsBar: true,
					linkIsSth: true
				} );
			} );

			it( 'synchronize values with current model state when the decorator that is "on" default is "off"', () => {
				setData( model, 'foo<$text linkHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="false">u[]rl</$text>bar' );

				expect( decoratorStates( command.manualDecorators ) ).to.deep.equal( {
					linkIsFoo: true,
					linkIsBar: true,
					linkIsSth: false
				} );

				command.manualDecorators.last.value = true;

				expect( decoratorStates( command.manualDecorators ) ).to.deep.equal( {
					linkIsFoo: true,
					linkIsBar: true,
					linkIsSth: true
				} );

				command.restoreManualDecoratorStates();

				expect( decoratorStates( command.manualDecorators ) ).to.deep.equal( {
					linkIsFoo: true,
					linkIsBar: true,
					linkIsSth: false
				} );
			} );
		} );

		describe( '_getDecoratorStateFromModel', () => {
			it( 'obtain current values from the model', () => {
				setData( model, 'foo[<$text linkHref="url" linkIsBar="true">url</$text>]bar' );

				expect( command._getDecoratorStateFromModel( 'linkIsFoo' ) ).to.be.undefined;
				expect( command._getDecoratorStateFromModel( 'linkIsBar' ) ).to.be.true;
			} );

			it( 'obtain current values from the image element', () => {
				setData( model, '[<image linkHref="url" linkIsBar="true"></image>]' );

				expect( command._getDecoratorStateFromModel( 'linkIsFoo' ) ).to.be.undefined;
				expect( command._getDecoratorStateFromModel( 'linkIsBar' ) ).to.be.true;
			} );

			it( 'obtain current values from the inline image element', () => {
				setData( model, '<paragraph>[<imageInline linkHref="url" linkIsBar="true"></imageInline>]</paragraph>' );

				expect( command._getDecoratorStateFromModel( 'linkIsFoo' ) ).to.be.undefined;
				expect( command._getDecoratorStateFromModel( 'linkIsBar' ) ).to.be.true;
			} );
		} );
	} );

	describe( '#automaticDecorators', () => {
		it( 'is defined', () => {
			expect( command.automaticDecorators ).to.be.an.instanceOf( AutomaticDecorators );
		} );
	} );
} );

function decoratorStates( manualDecorators ) {
	return Array.from( manualDecorators ).reduce( ( accumulator, currentValue ) => {
		accumulator[ currentValue.id ] = currentValue.value;
		return accumulator;
	}, {} );
}
