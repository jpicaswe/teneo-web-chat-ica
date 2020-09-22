import { shallowMount, mount } from '@vue/test-utils';
import '@testing-library/jest-dom/extend-expect'
import '@testing-library/jest-dom'
import { JSDOM } from 'jsdom'
import path from 'path'
import ejs from 'ejs'
import index from '../../src/index.js' //appears unused, but is required to access window.TeneoWebChat
import * as api  from "../../src/utils/api-function-names";

import TeneoWebChat from '@/components/../TeneoWebChat.vue'
import Header from '@/components/Header.vue'
import teneoApiPlugin from '../../src/plugins/teneo-api.js'

const index_js = path.resolve(__dirname, '../../src/index.js')


ejs.renderFile(index_js, function (err, str) {

    if (str) {
        let dom
        let container

        //Setup a Window for testing
        var testWindow;
        dom = new JSDOM(str);
        container = dom.window.document;
        testWindow = dom.window.globalThis;

        var mockStore = {
            state: {
              title: 'Teneo Web Chat',
              visibility: "minimized",
            }
          }


        //Mount TWC Component
        const wrapperTeneoWebChat = mount(TeneoWebChat, {
            title: 'Teneo Web Chat',
            teneoEngineUrl: 'https://teneo-api.com/some-bot',
            propsData: {
                isChatOpen: false
            },
            mocks:{
                $store: mockStore
            }
        })


        describe('Tests CALL methods of Teneo API', () => {
            beforeEach(() => {
                dom = new JSDOM(str);
                container = dom.window.document
            })

            
            test('Assert API_CALL_MAXIMIZE', async () => {
        
                //Mock api method
                const maximizeMock = jest.fn();
                wrapperTeneoWebChat.vm.maximize = maximizeMock;

                //Make API method call
                await window.TeneoWebChat.call(api.API_CALL_MAXIMIZE);

                //Assert
                expect(maximizeMock).toHaveBeenCalledTimes(1);
            })

        
            test('Assert API_CALL_MINIMIZE', async () => {
                //Mock api method
                const minimizeMock = jest.fn();
                wrapperTeneoWebChat.vm.minimize = minimizeMock;

                //Make API method call
                await window.TeneoWebChat.call(api.API_CALL_MINIMIZE);

                //Assert
                expect(minimizeMock).toHaveBeenCalledTimes(1);
            })


            test('Assert API_CALL_SEND_INPUT', async() => {
                //Mock teneoApi's sendBaseMessageMethod at TeneoWebChat.vue
                const mockSendBaseMessage = jest.fn();
                wrapperTeneoWebChat.vm.sendBaseMessage = mockSendBaseMessage
                
                //Make API method call
                const mockMessage = {'text':'What do you think about jimi hendriks?', 'parameters': {'userCountryCode':'NL'}};
                await window.TeneoWebChat.call(api.API_CALL_SEND_INPUT, mockMessage, false);

                //Assert
                expect(mockSendBaseMessage).toHaveBeenCalledTimes(1);
            })


            test('Assert API_CALL_END_SESSION', async() => {
                //Mock methods at TeneoWebChat.vue
                const mockCloseSession = jest.fn();
                const mockClearHistory = jest.fn();
                wrapperTeneoWebChat.vm.closeSession = mockCloseSession
                wrapperTeneoWebChat.vm.clearHistory = mockClearHistory
                
                //Make API method calls
                await window.TeneoWebChat.call(api.API_CALL_END_SESSION);
                await window.TeneoWebChat.call(api.API_CALL_CLEAR_CHAT_HISTORY);

                //Assert
                expect(mockCloseSession).toHaveBeenCalledTimes(1);
                expect(mockClearHistory).toHaveBeenCalledTimes(1);
            })


            test('Assert API_CALL_RESET', async() => {

                //Mock methods at TeneoWebChat.vue
                const minimizeMock = jest.fn();
                const mockClearHistory = jest.fn();
                const mockCloseSession = jest.fn();
                wrapperTeneoWebChat.vm.minimize = minimizeMock;
                wrapperTeneoWebChat.vm.clearHistory = mockClearHistory
                wrapperTeneoWebChat.vm.closeSession = mockCloseSession

                //Make API method calls
                await window.TeneoWebChat.call(api.API_CALL_RESET);        

                //RESET is a combination of Minimize + Clear History + End Session
                //Assert these 3 method calls
                expect(minimizeMock).toHaveBeenCalledTimes(1);
                expect(mockClearHistory).toHaveBeenCalledTimes(1);
                expect(mockCloseSession).toHaveBeenCalledTimes(1);
            })


            test('Assert API_CALL_ADD_MESSAGE', async() => {
                /* Mock onMessage received method at TeneoWebChat.vue, which
                is the recipient of the ADD_MESSAGE event */
                const mockOnMessageReceived = jest.fn();
                wrapperTeneoWebChat.vm._onMessageReceived = mockOnMessageReceived
                
                //Make API method call
                const mockMessage = {'text':'What do you think about jimi hendriks?', 'parameters': {'userCountryCode':'NL'}};
                await window.TeneoWebChat.call(api.API_CALL_ADD_MESSAGE, mockMessage, false);

                //Assert
                expect(mockOnMessageReceived).toHaveBeenCalledTimes(1);
            })


            test('Assert API_CALL_SET_WINDOW_TITLE', async()=> {
                //Mount component with mock store
                const wrapperHeader = mount(Header, {
                    propsData: {
                        onClose: jest.fn(),
                        onMinimize: jest.fn()
                    },
                    mocks:{
                        $store: mockStore
                    }
                })

                //Mock the implementation of setTitle in 'window.TeneoWebChat.helpers'
                const newTitle = 'New Title';
                window.TeneoWebChat.helpers.setTitle = jest.fn().mockImplementation((payload) => {      
                    mockStore.state.title = payload;
                  });

                //Call the API method under test
                await window.TeneoWebChat.call(api.API_CALL_SET_WINDOW_TITLE, newTitle);
                
                //Asert that setTitle was called, and that the value was set in the Header's template
                expect(window.TeneoWebChat.helpers.setTitle).toHaveBeenCalledTimes(1);
                expect(wrapperHeader.html()).toContain('New Title');
            })


            test('Assert API_GET_STATE', async ()=> {                
                window.TeneoWebChat.helpers.apiGetState = jest.fn().mockImplementation(() => {    
                    return {'visibility':mockStore.state.visibility}
                  });
                  
                const expected = {'visibility' : 'minimized'};
                const actual = await window.TeneoWebChat.get(api.API_GET_STATE);
                
                expect(window.TeneoWebChat.helpers.apiGetState).toHaveBeenCalledTimes(1);
                expect(actual).toEqual(expected);
            });

            test('Assert API_GET_CHAT_HISTORY', async ()=> {                
                window.TeneoWebChat.helpers.apiGetChatHistory = jest.fn().mockImplementation(() => {    
                    return [{"author":"bot","type":"text","data":{"text":"Good afternoon and welcome! This is a test message."}}]
                  });

                const chatHistory = await window.TeneoWebChat.get(api.API_GET_CHAT_HISTORY);
                expect(chatHistory.length).toBe(1);
                expect(chatHistory[0].author).toBe("bot");
                expect(chatHistory[0].type).toBe("text");
                expect(window.TeneoWebChat.helpers.apiGetChatHistory).toHaveBeenCalledTimes(1);
            });
        })//end describe
    } //end if
})