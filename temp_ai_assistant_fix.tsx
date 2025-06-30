        <TabsContent value="prompts" className="overflow-y-auto" style={{ height: 'calc(100vh - 260px)', padding: '12px' }}>
          <h4 className="font-medium text-gray-700 mb-3 text-sm">Quick Writing Help</h4>
          
          <div className="space-y-2">
            {quickPrompts.map((quickPrompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full justify-start h-auto p-2 text-left text-xs"
                onClick={() => {
                  setPrompt(quickPrompt.text);
                  aiHelpMutation.mutate(quickPrompt.text);
                }}
              >
                <quickPrompt.icon className="h-4 w-4 mr-2 text-purple-600 flex-shrink-0" />
                <span className="text-gray-700">{quickPrompt.text}</span>
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="citations" className="overflow-y-auto" style={{ height: 'calc(100vh - 260px)', padding: '12px' }}>
          <h4 className="font-medium text-gray-700 mb-3 text-sm">Citation Guidelines</h4>
          <div className="text-xs text-gray-600 space-y-3">
            <p className="text-sm">Remember these key principles:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>• Always cite your sources</li>
              <li>• Use quotation marks for direct quotes</li>
              <li>• Paraphrase in your own words</li>
              <li>• When in doubt, cite it out!</li>
            </ul>
          </div>
        </TabsContent>